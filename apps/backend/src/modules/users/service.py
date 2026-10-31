from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.auth.models import RefreshToken
from src.modules.auth.recovery import RecoveryChallenge
from src.middlewares.error_handler import ConflictException, NotFoundException, UnauthorizedException
from src.modules.users import repository
from src.modules.users.models import User
from src.modules.users.schemas import ChangePasswordRequest, UserCreate, UserUpdate
from src.utils.security import hash_password, verify_password


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    existing = await repository.get_user_by_email(db, payload.email)
    if existing:
        raise ConflictException("A user with this email already exists")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    return await repository.create_user(db, user)


async def get_user(db: AsyncSession, user_id: str) -> User:
    user = await repository.get_user_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    return user


async def list_users(db: AsyncSession) -> list[User]:
    return await repository.list_users(db)


async def update_user(db: AsyncSession, user_id: str, payload: UserUpdate) -> User:
    user = await get_user(db, user_id)
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    return await repository.update_user(db, user)


async def change_password(db: AsyncSession, user: User, payload: ChangePasswordRequest) -> None:
    checked_version = user.auth_version
    user = (await db.execute(select(User).where(User.id == user.id).with_for_update()
                            .execution_options(populate_existing=True))).scalar_one_or_none()
    if not user or not user.is_active or user.auth_version != checked_version:
        raise UnauthorizedException("Your account changed. Sign in again.")
    if not verify_password(payload.current_password, user.hashed_password):
        raise UnauthorizedException("Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    user.auth_version += 1
    user.reset_token = None
    user.reset_token_expires_at = None
    await db.execute(update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True))
    await db.execute(update(RecoveryChallenge).where(RecoveryChallenge.user_id == user.id,
                     RecoveryChallenge.consumed_at.is_(None)).values(consumed_at=datetime.utcnow()))
    await repository.update_user(db, user)
