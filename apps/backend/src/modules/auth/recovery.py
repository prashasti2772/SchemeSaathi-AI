"""Persisted, single-use CAPTCHA and email/mobile OTP password recovery."""
import base64
import hashlib
import hmac
import io
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException, BackgroundTasks
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import DateTime, ForeignKey, Integer, String, delete, select, update
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.config.database import Base
from src.config.settings import settings
from src.integrations import email_client
from src.config.logging import get_logger
from src.modules.auth.models import RefreshToken
from src.modules.users.models import User
from src.utils.security import hash_password

CAPTCHA_TTL = 300
OTP_TTL = 300
logger = get_logger("password_recovery")
RESEND_DELAY = 60
MAX_ATTEMPTS = 5


class CaptchaChallenge(Base):
    __tablename__ = "captcha_challenges"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    answer_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class RecoveryState(Base):
    __tablename__ = "password_recovery_state"
    account_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    next_send_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class RecoveryChallenge(Base):
    __tablename__ = "password_recovery_challenges"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_key: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    otp_hash: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    grant_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    grant_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


def secret_hash(purpose: str, identifier: str, value: str) -> str:
    return hmac.new(settings.JWT_SECRET_KEY.encode(), f"{purpose}:{identifier}:{value}".encode(), hashlib.sha256).hexdigest()


def captcha_text() -> str:
    return "".join(secrets.choice("23456789ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(6))


def otp_text() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def captcha_image(answer: str) -> str:
    image = Image.new("RGB", (260, 86), "#f0f4f8")
    draw = ImageDraw.Draw(image)
    for _ in range(9):
        draw.line([(secrets.randbelow(260), secrets.randbelow(86)), (secrets.randbelow(260), secrets.randbelow(86))], fill="#a6b9ca", width=2)
    font = ImageFont.load_default(size=38)
    for index, character in enumerate(answer):
        glyph = Image.new("RGBA", (46, 64), (0, 0, 0, 0))
        ImageDraw.Draw(glyph).text((5, 5), character, font=font, fill="#153858")
        glyph = glyph.rotate(secrets.randbelow(27) - 13, resample=Image.Resampling.BICUBIC)
        image.paste(glyph, (8 + index * 40, 8 + secrets.randbelow(9)), glyph)
    for _ in range(110):
        draw.point((secrets.randbelow(260), secrets.randbelow(86)), fill="#62839d")
    output = io.BytesIO()
    image.save(output, format="PNG")
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")


async def issue_captcha(db: AsyncSession) -> dict:
    now = datetime.utcnow()
    answer, identifier = captcha_text(), secrets.token_urlsafe(32)
    image = captcha_image(answer)
    await db.execute(delete(CaptchaChallenge).where(CaptchaChallenge.expires_at <= now))
    db.add(CaptchaChallenge(id=identifier, answer_hash=secret_hash("captcha", identifier, answer), expires_at=now + timedelta(seconds=CAPTCHA_TTL)))
    await db.commit()
    return {"captcha_id": identifier, "image": image, "expires_in": CAPTCHA_TTL}


async def verify_captcha(db: AsyncSession, identifier: str, answer: str) -> None:
    # Delete before checking: every answer consumes the challenge, even an incorrect one.
    row = (await db.execute(delete(CaptchaChallenge).where(CaptchaChallenge.id == identifier).returning(CaptchaChallenge.answer_hash, CaptchaChallenge.expires_at))).first()
    await db.commit()
    if not row or row.expires_at <= datetime.utcnow() or not hmac.compare_digest(row.answer_hash, secret_hash("captcha", identifier, answer.strip().upper())):
        raise HTTPException(400, "CAPTCHA is incorrect or expired. Refresh it and try again.")


async def deliver_code(recipient: str, code: str) -> None:
    # Run after the public response so delivery timing/status cannot enumerate accounts.
    try:
        delivered = await email_client.send_email(recipient, "SchemeSaathi password reset code",
            f"Your SchemeSaathi password reset code is {code}.\n\nIt expires in 5 minutes. Do not share this code. If you did not request it, ignore this email.")
        if not delivered:
            logger.warning("password_reset_delivery_failed", channel="email")
    except Exception:
        # Provider errors may contain credentials or personal data; do not print them.
        logger.warning("password_reset_delivery_failed", channel="email")


async def request_recovery(db: AsyncSession, user: User | None, identifier: str, background_tasks: BackgroundTasks) -> dict:
    if not email_client.email_ready():
        raise HTTPException(503, "Password recovery email is temporarily unavailable. Please try again later.")
    channel = "email"
    now = datetime.utcnow()
    active_user = user if user and user.is_active else None
    contact_key = secret_hash("contact", channel, identifier.strip().lower())
    account_key = secret_hash("account", "", str(active_user.id)) if active_user else contact_key
    # Per-contact cooldown behaves identically for registered and unregistered contacts.
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:
        from sqlalchemy.dialects.sqlite import insert
    reservation = insert(RecoveryState).values(account_key=contact_key, next_send_at=now + timedelta(seconds=RESEND_DELAY))
    reservation = reservation.on_conflict_do_update(index_elements=[RecoveryState.account_key], set_={"next_send_at": now + timedelta(seconds=RESEND_DELAY)}, where=RecoveryState.next_send_at <= now).returning(RecoveryState.account_key)
    if (await db.execute(reservation)).scalar_one_or_none() is None:
        await db.rollback()
        raise HTTPException(429, "Please wait 60 seconds before requesting another code.", headers={"Retry-After": str(RESEND_DELAY)})
    challenge_id, code = secrets.token_urlsafe(32), otp_text()
    await db.execute(delete(RecoveryChallenge).where(RecoveryChallenge.expires_at < now - timedelta(days=1)))
    await db.execute(delete(RecoveryState).where(RecoveryState.next_send_at < now - timedelta(days=1)))
    await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.account_key == account_key, RecoveryChallenge.consumed_at.is_(None)).values(consumed_at=now))
    db.add(RecoveryChallenge(id=challenge_id, account_key=account_key, user_id=active_user.id if active_user else None, otp_hash=secret_hash("otp", challenge_id, code), expires_at=now + timedelta(seconds=OTP_TTL)))
    await db.commit()
    if active_user:
        background_tasks.add_task(deliver_code, active_user.email, code)
    payload = {"challenge_id": challenge_id, "message": "If the email address is registered, a verification code has been sent. Check your inbox and spam folder, then wait 60 seconds before trying again.", "expires_in": OTP_TTL, "resend_after": RESEND_DELAY}
    return payload


async def verify_otp(db: AsyncSession, challenge_id: str, code: str) -> dict:
    now = datetime.utcnow()
    row = (await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.id == challenge_id, RecoveryChallenge.consumed_at.is_(None), RecoveryChallenge.verified_at.is_(None), RecoveryChallenge.expires_at > now, RecoveryChallenge.attempts < MAX_ATTEMPTS).values(attempts=RecoveryChallenge.attempts + 1).returning(RecoveryChallenge.user_id, RecoveryChallenge.otp_hash, RecoveryChallenge.attempts))).first()
    if not row:
        await db.rollback()
        raise HTTPException(410, "This code has expired or is no longer available. Request a new code.")
    valid = hmac.compare_digest(row.otp_hash, secret_hash("otp", challenge_id, code))
    if not valid or not row.user_id:
        await db.commit()
        if row.attempts >= MAX_ATTEMPTS:
            raise HTTPException(410, "Too many incorrect attempts. Request a new code.")
        raise HTTPException(400, "Incorrect verification code. Please try again.")
    token = secrets.token_urlsafe(48)
    saved = (await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.id == challenge_id, RecoveryChallenge.verified_at.is_(None), RecoveryChallenge.consumed_at.is_(None)).values(verified_at=now, grant_hash=secret_hash("grant", "", token), grant_expires_at=now + timedelta(seconds=OTP_TTL)).returning(RecoveryChallenge.id))).scalar_one_or_none()
    await db.commit()
    if not saved:
        raise HTTPException(410, "This code is no longer available. Request a new code.")
    return {"token": token, "expires_in": OTP_TTL}


async def reset_password(db: AsyncSession, token: str, password: str) -> dict:
    now = datetime.utcnow()
    user_id = (await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.grant_hash == secret_hash("grant", "", token), RecoveryChallenge.verified_at.is_not(None), RecoveryChallenge.consumed_at.is_(None), RecoveryChallenge.grant_expires_at > now).values(consumed_at=now).returning(RecoveryChallenge.user_id))).scalar_one_or_none()
    if not user_id:
        await db.rollback()
        raise HTTPException(410, "Your password reset session has expired. Request a new code.")
    user = (await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)).with_for_update())).scalar_one_or_none()
    if not user:
        await db.rollback()
        raise HTTPException(410, "Your password reset session is no longer available. Request a new code.")
    user.hashed_password = hash_password(password)
    user.auth_version += 1
    user.reset_token = None
    user.reset_token_expires_at = None
    await db.execute(update(RefreshToken).where(RefreshToken.user_id == user_id).values(revoked=True))
    await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.user_id == user_id, RecoveryChallenge.consumed_at.is_(None)).values(consumed_at=now))
    await db.commit()
    return {"message": "Password updated successfully."}
