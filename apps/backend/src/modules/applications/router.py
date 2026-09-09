from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.rbac_middleware import require_any_staff, require_operator
from src.modules.applications import service
from src.modules.applications.schemas import JourneyCreate, JourneyOut, JourneyStageUpdate, StatusEventOut
from src.modules.users.models import User

router = APIRouter(prefix="/applications", tags=["Applications"], dependencies=[Depends(require_any_staff)])


@router.post("/journeys", response_model=JourneyOut, status_code=201)
async def create_journey(payload: JourneyCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_journey(db, payload)


@router.get("/journeys/{journey_id}", response_model=JourneyOut)
async def get_journey(journey_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_journey(db, journey_id)


@router.patch("/journeys/{journey_id}/stage", response_model=JourneyOut, dependencies=[Depends(require_operator)])
async def update_stage(journey_id: str, payload: JourneyStageUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.update_stage(db, journey_id, payload.stage, payload.notes, current_user)


@router.get("/journeys/{journey_id}/events", response_model=list[StatusEventOut])
async def list_journey_events(journey_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_journey_events(db, journey_id)


@router.get("/beneficiary/{beneficiary_id}", response_model=list[JourneyOut])
async def list_journeys_for_beneficiary(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_journeys_for_beneficiary(db, beneficiary_id)
