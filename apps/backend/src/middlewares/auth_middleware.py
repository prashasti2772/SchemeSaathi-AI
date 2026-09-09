from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.error_handler import UnauthorizedException
from src.modules.users.models import User
from src.modules.users.repository import get_user_by_id
from src.utils.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(token: str | None = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    if not token:
        raise UnauthorizedException("Authentication credentials were not provided")
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise UnauthorizedException("Invalid or expired access token") from exc
    if payload.get("type") != "access":
        raise UnauthorizedException("Provided token is not an access token")
    user_id = payload.get("sub")
    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User account is inactive or does not exist")
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user
