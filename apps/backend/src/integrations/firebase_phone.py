"""Firebase SMS is sent and verified by the backend for registered contacts only.

The browser supplies only reCAPTCHA proof and the entered code. It never asserts
that authentication succeeded. Provider sessions remain encrypted server-side.
"""
import base64
import hashlib
import re
from datetime import datetime, timedelta

from cryptography.fernet import Fernet, InvalidToken
import httpx
from sqlalchemy import String, Text, DateTime, delete
from sqlalchemy.orm import Mapped, mapped_column
from src.config.database import Base
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("firebase_phone")


class FirebasePhoneSession(Base):
    __tablename__ = "firebase_phone_sessions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    encrypted_session: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


def ready():
    return bool(settings.SMS_PROVIDER == "firebase" and settings.FIREBASE_API_KEY and settings.FIREBASE_PROJECT_ID)


def cipher():
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(("firebase-session:" + settings.JWT_SECRET_KEY).encode()).digest()))


async def _request(method, payload, language="en"):
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post("https://identitytoolkit.googleapis.com/v1/accounts:" + method,
            params={"key": settings.FIREBASE_API_KEY}, headers={"X-Firebase-Locale": language}, json=payload)
        response.raise_for_status()
        return response.json()


async def send_code(db, challenge_id, mobile, recaptcha_token, language="en"):
    if not ready() or not re.fullmatch(r"[6-9][0-9]{9}", mobile or "") or not recaptcha_token:
        return False
    try:
        result = await _request("sendVerificationCode", {"phoneNumber": "+91" + mobile, "recaptchaToken": recaptcha_token}, language)
        session = result.get("sessionInfo")
        if not isinstance(session, str) or not session:
            return False
        now = datetime.utcnow()
        await db.execute(delete(FirebasePhoneSession).where(FirebasePhoneSession.expires_at <= now))
        db.add(FirebasePhoneSession(id=challenge_id, encrypted_session=cipher().encrypt(session.encode()).decode(), expires_at=now + timedelta(minutes=5)))
        await db.commit()
        return True
    except (httpx.HTTPError, ValueError, TypeError):
        logger.warning("firebase_sms_not_sent")
        return False


async def deliver_recovery(factory, challenge_id, mobile, recaptcha_token, language):
    async with factory() as db:
        await send_code(db, challenge_id, mobile, recaptcha_token, language)


async def verify_code(db, challenge_id, mobile, code):
    row = await db.get(FirebasePhoneSession, challenge_id)
    if not row or row.expires_at <= datetime.utcnow() or not re.fullmatch(r"[0-9]{6}", code):
        return False
    try:
        session = cipher().decrypt(row.encrypted_session.encode()).decode()
        result = await _request("signInWithPhoneNumber", {"sessionInfo": session, "code": code})
        # This is Firebase's HTTPS response, never a client-supplied token/boolean.
        return bool(result.get("idToken") and result.get("phoneNumber") == "+91" + (mobile or ""))
    except (httpx.HTTPError, ValueError, TypeError, InvalidToken):
        logger.warning("firebase_code_not_verified")
        return False
