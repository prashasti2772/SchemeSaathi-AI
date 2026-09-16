"""Persistent citizen accounts, email OTP authentication and support tickets."""
import uuid
from typing import Literal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from sqlalchemy import String, Text, select, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import Base, TimestampMixin, get_db
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

class CaptchaInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    captcha_id: str = Field(min_length=16, max_length=100)
    captcha_answer: str = Field(min_length=1, max_length=16)

class Register(CaptchaInput):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    password: str = Field(min_length=10, max_length=128)

class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

class ForgotPasswordRequest(CaptchaInput):
    identifier: EmailStr

class VerifyResetOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge_id: str = Field(min_length=16, max_length=100)
    otp: str = Field(pattern=r"^[0-9]{6}$")

class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
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
    return await login_otp.request_login(db, user)

@router.get("/login-methods")
async def login_methods(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return login_otp.methods()

class LoginChallengeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge_id: str = Field(min_length=16, max_length=100)

@router.post("/resend-login-otp")
@limiter.limit("5/minute")
async def resend_login_otp(request: Request, payload: LoginChallengeInput, db: AsyncSession = Depends(get_db)):
    return await login_otp.resend_login(db, payload.challenge_id)

@router.post("/verify-login-otp")
@limiter.limit("15/minute")
async def verify_login_otp(request: Request, payload: VerifyResetOtpRequest, db: AsyncSession = Depends(get_db)):
    user = await login_otp.verify_login(db, payload.challenge_id, payload.otp)
    return session(user)

@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    await recovery.verify_captcha(db, payload.captcha_id, payload.captcha_answer)
    identifier = str(payload.identifier).lower()
    user = (await db.execute(select(User).where(User.email == identifier))).scalar_one_or_none()
    return await recovery.request_recovery(db, user, identifier, background_tasks)

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
    model_config = ConfigDict(extra="forbid")
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
    model_config = ConfigDict(extra="forbid")
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
    model_config = ConfigDict(extra="forbid")
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
