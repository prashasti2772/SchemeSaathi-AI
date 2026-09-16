"""Persisted password-plus-OTP sign-in, independent of password recovery."""
import hmac
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import DateTime, ForeignKey, Integer, String, select, update
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.config.database import Base
from src.config.logging import get_logger
from src.integrations import email_client
from src.modules.auth.recovery import secret_hash, otp_text
from src.modules.users.models import User

OTP_TTL = 300
RESEND_DELAY = 60
MAX_ATTEMPTS = 5
logger = get_logger("login_verification")


class LoginState(Base):
    __tablename__ = "login_otp_state"
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    next_send_at: Mapped[datetime] = mapped_column(DateTime)


class LoginChallenge(Base):
    __tablename__ = "login_otp_challenges"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel: Mapped[str] = mapped_column(String(10))
    auth_version: Mapped[int] = mapped_column(Integer)
    password_hash: Mapped[str] = mapped_column(String(64))
    contact_hash: Mapped[str] = mapped_column(String(64))
    otp_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


def methods() -> dict:
    return {"email": email_client.email_ready(), "provider": "brevo"}


def destination(user: User) -> str:
    return user.email


def masked(contact: str) -> str:
    local, domain = contact.split("@", 1)
    return local[:1] + "***@" + domain


def active_challenge(row: LoginChallenge, user: User | None) -> bool:
    return bool(user and user.is_active and user.auth_version == row.auth_version
                and hmac.compare_digest(row.password_hash, secret_hash("login-password", str(user.id), user.hashed_password))
                and row.channel == "email"
                and hmac.compare_digest(row.contact_hash, secret_hash("login-contact", "email", destination(user))))


def expired() -> HTTPException:
    return HTTPException(410, "This sign-in code has expired or is no longer available. Sign in again to request a new code.")


async def request_login(db: AsyncSession, user: User) -> dict:
    # Serialize this user's issues/resends and reject a password changed since verification.
    checked_version, checked_password = user.auth_version, user.hashed_password
    user = (await db.execute(select(User).where(User.id == user.id).with_for_update().execution_options(populate_existing=True))).scalar_one()
    if not user.is_active or user.auth_version != checked_version or user.hashed_password != checked_password:
        raise HTTPException(401, "Your account changed. Sign in again.")
    channel = "email"
    contact = destination(user)
    if not email_client.email_ready() or not contact:
        raise HTTPException(503, "Email verification is temporarily unavailable. Please try again later.")
    now = datetime.utcnow()
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    reservation = insert(LoginState).values(user_id=user.id, next_send_at=now + timedelta(seconds=RESEND_DELAY))
    reservation = reservation.on_conflict_do_update(index_elements=[LoginState.user_id], set_={"next_send_at": now + timedelta(seconds=RESEND_DELAY)}, where=LoginState.next_send_at <= now).returning(LoginState.user_id)
    if (await db.execute(reservation)).scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(429, "Please wait 60 seconds before requesting another sign-in code.", headers={"Retry-After": "60"})
    await db.execute(update(LoginChallenge).where(LoginChallenge.user_id == user.id, LoginChallenge.consumed_at.is_(None)).values(consumed_at=now))
    challenge_id, code = secrets.token_urlsafe(32), otp_text()
    db.add(LoginChallenge(id=challenge_id, user_id=user.id, channel=channel, auth_version=user.auth_version,
        password_hash=secret_hash("login-password", str(user.id), user.hashed_password),
        contact_hash=secret_hash("login-contact", channel, contact), otp_hash=secret_hash("login-otp", challenge_id, code),
        expires_at=now + timedelta(seconds=OTP_TTL)))
    await db.commit()
    try:
        delivered = await email_client.send_email(contact, "SchemeSaathi sign-in verification code",
            f"Your SchemeSaathi sign-in code is {code}.\n\nIt expires in 5 minutes. Do not share this code. If you did not try to sign in, reset your password.")
    except Exception:
        # Provider exceptions can contain addresses, codes and credentials.
        delivered = False
    if not delivered:
        await db.execute(update(LoginChallenge).where(LoginChallenge.id == challenge_id).values(consumed_at=datetime.utcnow()))
        await db.commit()
        logger.warning("login_otp_delivery_failed", channel=channel)
        raise HTTPException(503, "The verification code could not be sent. Wait 60 seconds and try again.")
    payload = {"challenge_id": challenge_id, "channel": channel, "destination": masked(contact),
              "expires_in": OTP_TTL, "resend_after": RESEND_DELAY, "message": "A sign-in verification code has been sent to your registered email address."}
    return payload


async def resend_login(db: AsyncSession, challenge_id: str) -> dict:
    row = await db.get(LoginChallenge, challenge_id)
    # Allow a fresh code only during the five-minute password-verified session.
    if not row or row.consumed_at or row.expires_at <= datetime.utcnow() or row.attempts >= MAX_ATTEMPTS:
        raise expired()
    user = (await db.execute(select(User).where(User.id == row.user_id).with_for_update())).scalar_one_or_none()
    if not active_challenge(row, user):
        raise expired()
    return await request_login(db, user)


async def verify_login(db: AsyncSession, challenge_id: str, code: str) -> User:
    row = await db.get(LoginChallenge, challenge_id)
    if not row:
        raise expired()
    user = (await db.execute(select(User).where(User.id == row.user_id).with_for_update())).scalar_one_or_none()
    if not active_challenge(row, user):
        raise expired()
    now = datetime.utcnow()
    attempt = (await db.execute(update(LoginChallenge).where(LoginChallenge.id == challenge_id,
        LoginChallenge.consumed_at.is_(None), LoginChallenge.expires_at > now,
        LoginChallenge.attempts < MAX_ATTEMPTS).values(attempts=LoginChallenge.attempts + 1)
        .returning(LoginChallenge.otp_hash, LoginChallenge.attempts, LoginChallenge.channel))).first()
    if not attempt:
        await db.rollback()
        raise expired()
    valid = hmac.compare_digest(attempt.otp_hash, secret_hash("login-otp", challenge_id, code))
    if not valid:
        await db.commit()
        if attempt.attempts >= MAX_ATTEMPTS:
            raise HTTPException(410, "Too many incorrect attempts. Sign in again to request a new code.")
        raise HTTPException(400, "Incorrect verification code. Please try again.")
    await db.execute(update(LoginChallenge).where(LoginChallenge.id == challenge_id).values(consumed_at=now))
    user.is_verified = True
    await db.commit()
    return user
