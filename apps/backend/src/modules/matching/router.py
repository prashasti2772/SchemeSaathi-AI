from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_any_staff, require_operator
from src.modules.matching import service
from src.modules.matching.schemas import MatchResultOut, MatchStatusUpdate, RunMatchingRequest

router = APIRouter(prefix="/matching", tags=["Matching"], dependencies=[Depends(require_any_staff)])


@router.post("/run", response_model=list[MatchResultOut])
async def run_matching(payload: RunMatchingRequest, db: AsyncSession = Depends(get_db)):
    return await service.run_matching_for_beneficiary(db, str(payload.beneficiary_id))


@router.get("/beneficiary/{beneficiary_id}", response_model=list[MatchResultOut])
async def list_matches(beneficiary_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_matches_for_beneficiary(db, beneficiary_id)


@router.patch("/{match_id}/status", response_model=MatchResultOut, dependencies=[Depends(require_operator)])
async def update_match_status(match_id: str, payload: MatchStatusUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_match_status(db, match_id, payload.status)
