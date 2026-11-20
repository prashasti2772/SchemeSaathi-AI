from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.rbac_middleware import require_operator
from src.modules.analytics import service
from src.modules.analytics.schemas import DashboardSummaryResponse, FunnelAnalyticsResponse, GeographicGapEntry, SchemeAnalyticsEntry

router = APIRouter(prefix="/analytics", tags=["Analytics"], dependencies=[Depends(require_operator)])


@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    return await service.get_dashboard_summary(db)


@router.get("/funnel", response_model=FunnelAnalyticsResponse)
async def get_funnel_analytics(db: AsyncSession = Depends(get_db)):
    return await service.get_funnel_analytics(db)


@router.get("/geographic-gaps", response_model=list[GeographicGapEntry])
async def get_geographic_gaps(db: AsyncSession = Depends(get_db)):
    return await service.get_geographic_gaps(db)


@router.get("/schemes", response_model=list[SchemeAnalyticsEntry])
async def get_scheme_analytics(db: AsyncSession = Depends(get_db)):
    return await service.get_scheme_analytics(db)
