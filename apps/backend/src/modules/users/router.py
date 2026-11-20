from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.rbac_middleware import require_admin
from src.modules.users import service
from src.modules.users.models import User
from src.modules.users.schemas import ChangePasswordRequest, UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/change-password", status_code=204)
async def change_my_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await service.change_password(db, current_user, payload)


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_admin)])
async def list_all_users(response: Response, limit: int = Query(100, ge=1, le=200),
                         offset: int = Query(0, ge=0), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return (await db.execute(select(User).order_by(User.created_at.desc()).limit(limit).offset(offset))).scalars().all()


@router.post("", response_model=UserOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_new_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_user(db, payload)


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
async def get_user_by_id(user_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_user(db, user_id)


@router.patch("/{user_id}", response_model=UserOut, dependencies=[Depends(require_admin)])
async def update_existing_user(user_id: str, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_user(db, user_id, payload)
