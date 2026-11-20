from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.rbac_middleware import require_admin, require_facilitator
from src.modules.facilitators import service
from src.modules.facilitators.schemas import AssistedCaseCreate, AssistedCaseOut, AssistedCaseUpdate, FacilitatorCreate, FacilitatorOut
from src.modules.users.models import User

router = APIRouter(prefix="/facilitators", tags=["Facilitators"])


@router.post("", response_model=FacilitatorOut, status_code=201, dependencies=[Depends(require_admin)])
async def create_facilitator(payload: FacilitatorCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_facilitator(db, payload)


@router.post("/cases", response_model=AssistedCaseOut, status_code=201, dependencies=[Depends(require_facilitator)])
async def open_assisted_case(payload: AssistedCaseCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.open_assisted_case(db, payload, current_user)


@router.patch("/cases/{case_id}/status", response_model=AssistedCaseOut, dependencies=[Depends(require_facilitator)])
async def update_case_status(case_id: str, payload: AssistedCaseUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.update_case_status(db, case_id, payload.status, current_user)


@router.get("/cases/mine", response_model=list[AssistedCaseOut], dependencies=[Depends(require_facilitator)])
async def list_my_cases(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.list_cases_for_facilitator(db, current_user)
