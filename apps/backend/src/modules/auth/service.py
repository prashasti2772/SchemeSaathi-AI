from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import UnauthorizedException
from src.modules.auth.models import RefreshToken
from src.modules.auth import login_otp
from src.modules.auth.schemas import LoginRequest, TokenResponse
from src.modules.users.models import User
from src.modules.users.repository import get_user_by_email
from src.utils.security import create_access_token, create_refresh_token, hash_token, verify_password


async def authenticate_user(db: AsyncSession, payload: LoginRequest) -> dict:
    user = await get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedException("This account has been deactivated")
    return await login_otp.request_login(db, user)


async def refresh_access_token(db: AsyncSession, raw_refresh_token: str) -> TokenResponse:
    from src.utils.security import decode_token

    try:
        payload = decode_token(raw_refresh_token)
    except ValueError as exc:
        raise UnauthorizedException("Invalid or expired refresh token") from exc
    # Password-only sessions issued before OTP was required cannot be upgraded.
    if (payload.get("type") != "refresh" or payload.get("auth_method") != "email_otp"
            or not isinstance(payload.get("jti"), str)):
        raise UnauthorizedException("Sign in again with your password and verification code.")

    token_hash = hash_token(payload["jti"])
    user_id = (await db.execute(select(RefreshToken.user_id).where(RefreshToken.token_hash == token_hash))).scalar_one_or_none()
    if not user_id:
        raise UnauthorizedException("Refresh token has been revoked or reused")

    # Lock the user before token rows, matching password-reset lock order on PostgreSQL.
    user_result = await db.execute(select(User).where(User.id == user_id).with_for_update())
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active or str(user.id) != payload.get("sub"):
        await db.rollback()
        raise UnauthorizedException("User account is inactive or does not exist")

    if payload.get("auth_version", 0) != user.auth_version:
        await db.rollback()
        raise UnauthorizedException("Your session has expired. Please sign in again.")

    # Atomic consumption also protects SQLite, where FOR UPDATE is not available.
    consumed = (await db.execute(update(RefreshToken).where(
        RefreshToken.token_hash == token_hash, RefreshToken.revoked.is_(False),
        RefreshToken.expires_at > datetime.now(timezone.utc),
    ).values(revoked=True).returning(RefreshToken.user_id))).scalar_one_or_none()
    if not consumed:
        await db.rollback()
        raise UnauthorizedException("Refresh token has been revoked or reused")
    new_pair, new_token_hash = _token_pair(db, user)
    await db.execute(update(RefreshToken).where(RefreshToken.token_hash == token_hash).values(replaced_by_hash=new_token_hash))
    await db.commit()
    return new_pair


async def revoke_refresh_token(db: AsyncSession, raw_refresh_token: str) -> None:
    from src.utils.security import decode_token

    try:
        payload = decode_token(raw_refresh_token)
    except ValueError:
        return
    token_hash = hash_token(payload.get("jti", ""))
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored_token = result.scalar_one_or_none()
    if stored_token:
        stored_token.revoked = True
        await db.commit()


def _token_pair(db: AsyncSession, user: User):
    access_token = create_access_token(subject=str(user.id), role=user.role.value, auth_version=user.auth_version)
    signed_refresh_token, refresh_hash, expires_at = create_refresh_token(subject=str(user.id), auth_version=user.auth_version, otp_verified=True)
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires_at))
    token_response = TokenResponse(access_token=access_token, refresh_token=signed_refresh_token, user=user)
    return token_response, refresh_hash


async def issue_otp_session(db: AsyncSession, user: User) -> TokenResponse:
    """Called only after consuming a valid password-plus-email-OTP challenge."""
    token_response, _ = _token_pair(db, user)
    await db.commit()
    return token_response
