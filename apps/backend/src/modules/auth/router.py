from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rate_limiter import limiter
from src.config.settings import settings
from src.modules.auth import service
from src.modules.auth.schemas import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.authenticate_user(db, payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await service.refresh_access_token(db, payload.refresh_token)


@router.post("/logout", status_code=204)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await service.revoke_refresh_token(db, payload.refresh_token)
