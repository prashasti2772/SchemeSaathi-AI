"""Persistent citizen accounts, support tickets and consent-based outreach."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
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

class Register(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(pattern=r"^[6-9]\d{9}$")
    password: str = Field(min_length=10, max_length=128)

class Login(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)

def account(user):
    return {"id": str(user.id), "fullName": user.full_name, "email": user.email,
            "mobile": user.mobile, "role": user.role.value}

def session(user):
    return {"access_token": create_access_token(str(user.id), user.role.value), "user": account(user)}

@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, payload: Register, db: AsyncSession = Depends(get_db)):
    user = User(full_name=payload.full_name.strip(), email=str(payload.email).lower(), mobile=payload.mobile,
                hashed_password=hash_password(payload.password), role=UserRole.CITIZEN)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An account already uses this email or mobile number")
    await db.refresh(user)
    return session(user)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, payload: Login, db: AsyncSession = Depends(get_db)):
    key = payload.identifier.strip().lower()
    user = (await db.execute(select(User).where(or_(User.email == key, User.mobile == key)))).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password) or not user.is_active:
        raise HTTPException(401, "Invalid credentials")
    return session(user)

@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return account(user)

class TicketInput(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=3000)

@router.post("/tickets", status_code=201)
@limiter.limit("5/minute")
async def create_ticket(request: Request, payload: TicketInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ticket = Ticket(user_id=str(user.id), **payload.model_dump())
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return {"id": ticket.id, "status": ticket.status}

@router.get("/tickets")
async def tickets(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Ticket).order_by(Ticket.created_at.desc())
    if user.role == UserRole.CITIZEN:
        query = query.where(Ticket.user_id == str(user.id))
    return (await db.execute(query)).scalars().all()

class TicketReply(BaseModel):
    response: str = Field(min_length=3, max_length=3000)
    status: str = Field(pattern="^(open|in_progress|resolved)$")

@router.patch("/tickets/{ticket_id}", dependencies=[Depends(require_any_staff)])
async def reply(ticket_id: str, payload: TicketReply, db: AsyncSession = Depends(get_db)):
    ticket = await db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    ticket.response, ticket.status = payload.response, payload.status
    await db.commit()
    return {"id": ticket.id, "status": ticket.status}

class Consent(BaseModel):
    consent: bool

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

@router.post("/outreach-preview", dependencies=[Depends(require_any_staff)])
async def preview(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Subscription).where(Subscription.consent.is_(True), Subscription.last_sent.is_(None)).limit(100))).scalars().all()
    return {"recipients": len(rows), "message": f"Discover schemes for your business: {settings.PUBLIC_SITE_URL}",
            "live_enabled": settings.SMS_LIVE_ENABLED, "status": "preview_only"}

@router.post("/outreach-send", dependencies=[Depends(require_any_staff)])
@limiter.limit("1/minute")
async def send_outreach(request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.SMS_LIVE_ENABLED or not settings.MSG91_AUTH_KEY or not settings.MSG91_TEMPLATE_ID:
        raise HTTPException(503, "Live SMS is disabled. Configure MSG91 and an approved template first.")
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
