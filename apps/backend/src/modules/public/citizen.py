"""Persistent citizen accounts, support tickets and consent-based outreach."""
import uuid
import re
from typing import Literal
from urllib.parse import urlsplit
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field, TypeAdapter, model_validator
from sqlalchemy import String, Text, select, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from src.config.database import Base, TimestampMixin, get_db
from src.config.settings import settings
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.rbac_middleware import require_any_staff
from src.middlewares.rate_limiter import limiter
from src.modules.users.models import User, UserRole
from src.modules.auth import login_otp, recovery
from src.modules.public import support_service
from src.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/citizen", tags=["Citizen"])

class Ticket(Base, TimestampMixin):
    __tablename__ = "support_tickets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    subject: Mapped[str] = mapped_column(String(150))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")
    response: Mapped[str] = mapped_column(Text, default="")

class Subscription(Base, TimestampMixin):
    __tablename__ = "sms_subscriptions"
    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mobile: Mapped[str] = mapped_column(String(10))
    consent: Mapped[bool] = mapped_column(default=False)
    last_sent: Mapped[datetime | None] = mapped_column(nullable=True)

class CaptchaInput(BaseModel):
    captcha_id: str = Field(min_length=16, max_length=100)
    captcha_answer: str = Field(min_length=1, max_length=16)

class Register(CaptchaInput):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    password: str = Field(min_length=10, max_length=128)

class PhoneCaptchaInput(BaseModel):
    recaptcha_token: str | None = Field(default=None, max_length=8192)
    language: Literal["en", "hi", "mr", "gu", "ta", "te", "bn", "kn"] = "en"

class Login(PhoneCaptchaInput):
    channel: Literal["email", "mobile"] = "email"
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

class ForgotPasswordRequest(CaptchaInput, PhoneCaptchaInput):
    channel: Literal["email", "mobile"] = "email"
    identifier: str = Field(min_length=3, max_length=255)

    @model_validator(mode="after")
    def validate_contact(self):
        self.identifier = self.identifier.strip()
        if self.channel == "email":
            self.identifier = str(TypeAdapter(EmailStr).validate_python(self.identifier)).lower()
        elif not re.fullmatch(r"[6-9][0-9]{9}", self.identifier):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return self

class VerifyResetOtpRequest(BaseModel):
    challenge_id: str = Field(min_length=16, max_length=100)
    otp: str = Field(pattern=r"^[0-9]{6}$")

class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    password: str = Field(min_length=10, max_length=128)

async def find_user_by_identifier(db: AsyncSession, identifier: str):
    key = identifier.strip().lower()
    return (await db.execute(select(User).where(or_(User.email == key, User.mobile == key)))).scalar_one_or_none()


def account(user):
    return {"id": str(user.id), "fullName": user.full_name, "email": user.email,
            "mobile": user.mobile, "role": user.role.value}

def session(user):
    return {"access_token": create_access_token(str(user.id), user.role.value, user.auth_version), "user": account(user)}

@router.get("/captcha")
@limiter.limit("20/minute")
async def captcha(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return await recovery.issue_captcha(db)

@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, payload: Register, db: AsyncSession = Depends(get_db)):
    await recovery.verify_captcha(db, payload.captcha_id, payload.captcha_answer)
    existing = (await db.execute(select(User.id).where(or_(User.email == str(payload.email).lower(), User.mobile == payload.mobile)).limit(1))).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Already registered. An account with this email or mobile number exists. Sign in or reset your password.")
    user = User(full_name=payload.full_name.strip(), email=str(payload.email).lower(), mobile=payload.mobile,
                hashed_password=hash_password(payload.password), role=UserRole.CITIZEN)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "Already registered. An account with this email or mobile number exists. Sign in or reset your password.")
    await db.refresh(user)
    return {"message": "Account created. Sign in with your password and verification code.", "requires_login": True}

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, payload: Login, db: AsyncSession = Depends(get_db)):
    user = await find_user_by_identifier(db, payload.identifier)
    if not user or not verify_password(payload.password, user.hashed_password) or not user.is_active:
        raise HTTPException(401, "Invalid credentials")
    return await login_otp.request_login(db, user, payload.channel, payload.recaptcha_token, payload.language)

@router.get("/phone-config")
async def phone_config(response: Response):
    response.headers["Cache-Control"] = "no-store"
    from src.integrations.firebase_phone import ready
    # Firebase WEB config is public by design. Never include service-account/SMTP credentials.
    return {"enabled": ready(), "config": {"apiKey": settings.FIREBASE_API_KEY,
        "projectId": settings.FIREBASE_PROJECT_ID, "authDomain": settings.FIREBASE_AUTH_DOMAIN,
        "appId": settings.FIREBASE_APP_ID} if ready() else None}

@router.get("/login-methods")
async def login_methods(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return login_otp.methods()

class LoginChallengeInput(PhoneCaptchaInput):
    challenge_id: str = Field(min_length=16, max_length=100)

@router.post("/resend-login-otp")
@limiter.limit("5/minute")
async def resend_login_otp(request: Request, payload: LoginChallengeInput, db: AsyncSession = Depends(get_db)):
    return await login_otp.resend_login(db, payload.challenge_id, payload.recaptcha_token, payload.language)

@router.post("/verify-login-otp")
@limiter.limit("15/minute")
async def verify_login_otp(request: Request, payload: VerifyResetOtpRequest, db: AsyncSession = Depends(get_db)):
    user = await login_otp.verify_login(db, payload.challenge_id, payload.otp)
    return session(user)

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    await recovery.verify_captcha(db, payload.captcha_id, payload.captcha_answer)
    # Never fall back to the other channel or accept a separate delivery address.
    contact_column = User.email if payload.channel == "email" else User.mobile
    user = (await db.execute(select(User).where(contact_column == payload.identifier))).scalar_one_or_none()
    return await recovery.request_recovery(db, user, payload.identifier, payload.channel, background_tasks, payload.recaptcha_token, payload.language)

@router.post("/verify-reset-otp")
@limiter.limit("15/minute")
async def verify_reset_otp(request: Request, payload: VerifyResetOtpRequest, db: AsyncSession = Depends(get_db)):
    return await recovery.verify_otp(db, payload.challenge_id, payload.otp)

@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    return await recovery.reset_password(db, payload.token, payload.password)

@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return account(user)

class TicketInput(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=3000)

    @model_validator(mode="after")
    def reject_blank(self):
        self.subject, self.message = self.subject.strip(), self.message.strip()
        if len(self.subject) < 3 or len(self.message) < 10:
            raise ValueError("Enter a subject and a description of the issue")
        return self


@router.post("/tickets", status_code=201)
@limiter.limit("5/minute")
async def create_ticket(request: Request, payload: TicketInput, background_tasks: BackgroundTasks,
                        user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ticket = Ticket(id=str(uuid.uuid4()), user_id=str(user.id), **payload.model_dump())
    db.add(ticket)
    deliveries = support_service.queue_notifications(db, ticket.id, user.email, "ticket_created")
    await db.commit()
    await db.refresh(ticket)
    background_tasks.add_task(support_service.deliver_notifications, deliveries)
    return (await support_service.ticket_views(db, [ticket]))[0]


@router.get("/tickets")
async def tickets(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Ticket).order_by(Ticket.created_at.desc())
    if user.role == UserRole.CITIZEN:
        query = query.where(Ticket.user_id == str(user.id))
    return await support_service.ticket_views(db, (await db.execute(query)).scalars().all())


class TicketReply(BaseModel):
    response: str = Field(min_length=3, max_length=3000)
    status: Literal["open", "in_progress", "resolved"]

    @model_validator(mode="after")
    def reject_blank(self):
        self.response = self.response.strip()
        if len(self.response) < 3:
            raise ValueError("Enter a response")
        return self


async def append_ticket_reply(db, ticket, user, message, status):
    # Preserve the response recorded before conversation history was introduced.
    if ticket.response:
        existing = (await db.execute(select(support_service.SupportReply.id).where(
            support_service.SupportReply.ticket_id == ticket.id).limit(1))).first()
        if not existing:
            db.add(support_service.SupportReply(ticket_id=ticket.id, author_id="legacy",
                author_role="support", message=ticket.response, status=ticket.status,
                created_at=ticket.updated_at))
    db.add(support_service.SupportReply(ticket_id=ticket.id, author_id=str(user.id),
        author_role=user.role.value, message=message, status=status))
    ticket.status = status
    ticket.updated_at = datetime.utcnow()


@router.patch("/tickets/{ticket_id}", dependencies=[Depends(require_any_staff)])
@limiter.limit("20/minute")
async def reply(request: Request, ticket_id: str, payload: TicketReply, background_tasks: BackgroundTasks,
                user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    await append_ticket_reply(db, ticket, user, payload.response, payload.status)
    ticket.response = payload.response
    owner = await db.get(User, uuid.UUID(ticket.user_id))
    deliveries = support_service.queue_notifications(db, ticket.id, owner.email, "staff_reply") if owner else []
    await db.commit()
    await db.refresh(ticket)
    background_tasks.add_task(support_service.deliver_notifications, deliveries)
    return (await support_service.ticket_views(db, [ticket]))[0]


class TicketFollowup(BaseModel):
    message: str = Field(min_length=3, max_length=3000)


@router.post("/tickets/{ticket_id}/messages", status_code=201)
@limiter.limit("10/minute")
async def followup(request: Request, ticket_id: str, payload: TicketFollowup, background_tasks: BackgroundTasks,
                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ticket = await db.get(Ticket, ticket_id)
    if not ticket or ticket.user_id != str(user.id):
        raise HTTPException(404, "Ticket not found")
    message = payload.message.strip()
    if len(message) < 3:
        raise HTTPException(422, "Enter a follow-up message")
    await append_ticket_reply(db, ticket, user, message, "open")
    deliveries = support_service.queue_notifications(db, ticket.id, user.email, "user_followup")
    await db.commit()
    await db.refresh(ticket)
    background_tasks.add_task(support_service.deliver_notifications, deliveries)
    return (await support_service.ticket_views(db, [ticket]))[0]

class Consent(BaseModel):
    consent: bool

def sms_ready():
    url = urlsplit(settings.PUBLIC_SITE_URL)
    return bool(settings.SMS_LIVE_ENABLED and settings.MSG91_AUTH_KEY and settings.MSG91_TEMPLATE_ID
                and settings.MSG91_SENDER_ID and url.scheme == "https" and url.hostname
                and url.hostname not in {"localhost", "127.0.0.1"} and not url.hostname.endswith(".example"))

@router.get("/sms-consent")
async def consent_status(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(Subscription, str(user.id))
    return {"consent": bool(row and row.consent), "mobile": user.mobile, "live_enabled": sms_ready()}

@router.put("/sms-consent")
async def consent(payload: Consent, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user.mobile:
        raise HTTPException(422, "A registered mobile number is required")
    row = await db.get(Subscription, str(user.id))
    if not row:
        row = Subscription(user_id=str(user.id), mobile=user.mobile)
        db.add(row)
    row.consent = payload.consent
    await db.commit()
    return {"consent": row.consent}

async def deliver_website_sms(mobiles):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post("https://api.msg91.com/api/v5/flow/", headers={"authkey": settings.MSG91_AUTH_KEY}, json={
                "flow_id": settings.MSG91_TEMPLATE_ID, "sender": settings.MSG91_SENDER_ID,
                "recipients": [{"mobiles": "91" + mobile, "website": settings.PUBLIC_SITE_URL} for mobile in mobiles]})
            response.raise_for_status()
            if response.json().get("type") != "success":
                raise ValueError("Provider rejected request")
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "SMS provider did not confirm acceptance. Please wait before trying again.")


@router.post("/website-sms")
@limiter.limit("3/day")
async def send_website_sms(request: Request, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not sms_ready():
        raise HTTPException(503, "Website SMS is currently unavailable. You can copy the website link instead.")
    if not user.mobile:
        raise HTTPException(422, "A registered mobile number is required")
    now = datetime.utcnow()
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    reservation = insert(support_service.WebsiteSms).values(user_id=str(user.id), last_requested=now, status="pending")
    reservation = reservation.on_conflict_do_update(index_elements=[support_service.WebsiteSms.user_id],
        set_={"last_requested": now, "status": "pending"},
        where=support_service.WebsiteSms.last_requested < now - timedelta(hours=24)).returning(support_service.WebsiteSms.user_id)
    if (await db.execute(reservation)).scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(429, "A website SMS was already requested today. Please wait 24 hours.", headers={"Retry-After": "86400"})
    await db.commit()
    try:
        await deliver_website_sms([user.mobile])
    except HTTPException:
        await db.execute(update(support_service.WebsiteSms).where(support_service.WebsiteSms.user_id == str(user.id)).values(status="failed"))
        await db.commit()
        raise
    await db.execute(update(support_service.WebsiteSms).where(support_service.WebsiteSms.user_id == str(user.id)).values(status="accepted"))
    await db.commit()
    return {"status": "provider_accepted"}

@router.post("/outreach-preview", dependencies=[Depends(require_any_staff)])
async def preview(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Subscription).where(Subscription.consent.is_(True), Subscription.last_sent.is_(None)).limit(100))).scalars().all()
    return {"recipients": len(rows), "message": f"Discover schemes for your business: {settings.PUBLIC_SITE_URL}",
            "live_enabled": sms_ready(), "status": "preview_only"}

@router.post("/outreach-send", dependencies=[Depends(require_any_staff)])
@limiter.limit("1/minute")
async def send_outreach(request: Request, db: AsyncSession = Depends(get_db)):
    if not sms_ready():
        raise HTTPException(503, "Live SMS is disabled. Configure MSG91, an approved template and the public HTTPS website URL first.")
    # Atomically reserve a batch before the network call to prevent duplicate sends.
    pending = select(Subscription.user_id).where(Subscription.consent.is_(True), Subscription.last_sent.is_(None)).limit(100)
    rows = (await db.execute(update(Subscription).where(
        Subscription.user_id.in_(pending), Subscription.consent.is_(True), Subscription.last_sent.is_(None)
    ).values(last_sent=datetime.utcnow()).returning(Subscription.mobile))).scalars().all()
    await db.commit()
    if not rows:
        return {"status": "no_recipients", "count": 0}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post("https://api.msg91.com/api/v5/flow/", headers={"authkey": settings.MSG91_AUTH_KEY}, json={
                "flow_id": settings.MSG91_TEMPLATE_ID, "sender": settings.MSG91_SENDER_ID,
                "recipients": [{"mobiles": "91" + r, "website": settings.PUBLIC_SITE_URL} for r in rows]})
            response.raise_for_status()
            result = response.json()
            if result.get("type") != "success":
                raise ValueError("Provider rejected request")
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "SMS provider did not confirm acceptance. Batch remains reserved to avoid duplicates; check provider logs before any manual retry.")
    return {"status": "provider_accepted", "count": len(rows)}
