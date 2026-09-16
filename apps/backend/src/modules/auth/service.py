from datetime import datetime, timezone
from sqlalchemy import select
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
    # Legacy password-only refresh sessions must reauthenticate with the OTP flow.
    raise UnauthorizedException("Sign in again with your password and verification code.")


async def _legacy_refresh_access_token(db: AsyncSession, raw_refresh_token: str) -> TokenResponse:
    from src.utils.security import decode_token

    try:
        payload = decode_token(raw_refresh_token)
    except ValueError as exc:
        raise UnauthorizedException("Invalid or expired refresh token") from exc
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Provided token is not a refresh token")

    token_hash = hash_token(payload["jti"])
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored_token = result.scalar_one_or_none()
    if not stored_token or stored_token.revoked:
        raise UnauthorizedException("Refresh token has been revoked or reused")
    if stored_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise UnauthorizedException("Refresh token has expired")

    user_result = await db.execute(select(User).where(User.id == stored_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User account is inactive or does not exist")

    if payload.get("auth_version", 0) != user.auth_version:
        raise UnauthorizedException("Your session has expired. Please sign in again.")

    stored_token.revoked = True
    new_pair, new_token_hash = await _issue_token_pair(db, user, return_hash=True)
    stored_token.replaced_by_hash = new_token_hash
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


async def _issue_token_pair(db: AsyncSession, user: User, return_hash: bool = False):
    access_token = create_access_token(subject=str(user.id), role=user.role.value, auth_version=user.auth_version)
    signed_refresh_token, refresh_hash, expires_at = create_refresh_token(subject=str(user.id), auth_version=user.auth_version)
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires_at))
    await db.commit()
    token_response = TokenResponse(access_token=access_token, refresh_token=signed_refresh_token, user=user)
    if return_hash:
        return token_response, refresh_hash
    return token_response
