import hashlib
import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from src.config.settings import settings

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            # Passlib's bcrypt backend probing is incompatible with bcrypt 5.
            # Existing bcrypt hashes used its historical 72-byte password limit.
            return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("ascii"))
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError):
        # A malformed legacy hash must fail authentication, not produce a 500.
        return False


def create_access_token(subject: str, role: str, auth_version: int = 0) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "role": role, "type": "access", "exp": expire, "auth_version": auth_version}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str, auth_version: int = 0, *, otp_verified: bool = False) -> tuple[str, str, datetime]:
    raw_token = secrets.token_urlsafe(48)
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": subject, "jti": raw_token, "type": "refresh", "exp": expire, "auth_version": auth_version}
    if otp_verified:
        payload["auth_method"] = "email_otp"
    signed_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return signed_token, hash_token(raw_token), expire


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
