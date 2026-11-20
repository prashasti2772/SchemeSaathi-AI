from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_any_staff
from src.modules.readiness import service
from src.modules.readiness.schemas import ReadinessCheckOut, ReadinessCheckRequest

router = APIRouter(prefix="/readiness", tags=["Readiness"], dependencies=[Depends(require_any_staff)])


@router.post("/check", response_model=ReadinessCheckOut, status_code=201)
async def run_readiness_check(payload: ReadinessCheckRequest, db: AsyncSession = Depends(get_db)):
    return await service.run_readiness_check(db, payload)


@router.get("/beneficiary/{beneficiary_id}", response_model=list[ReadinessCheckOut])
async def list_checks(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_checks_for_beneficiary(db, beneficiary_id)
