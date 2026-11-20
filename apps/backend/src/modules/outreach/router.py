from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.database import get_db
from src.middlewares.auth_middleware import get_current_user
from src.middlewares.rbac_middleware import require_operator
from src.modules.outreach import service
from src.modules.outreach.schemas import AudienceOut, CampaignCreate, CampaignOut, DeliveryEventOut
from src.modules.users.models import User

router = APIRouter(prefix="/outreach", tags=["Outreach"], dependencies=[Depends(require_operator)])


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
async def create_campaign(payload: CampaignCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.create_campaign(db, payload, current_user)


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    return await service.get_campaign(db, campaign_id)


@router.post("/campaigns/{campaign_id}/build-audience", response_model=list[AudienceOut])
async def build_audience(campaign_id: str, db: AsyncSession = Depends(get_db)):
    return await service.build_audience(db, campaign_id)


@router.post("/campaigns/{campaign_id}/launch", response_model=CampaignOut)
async def launch_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    return await service.launch_campaign(db, campaign_id)


@router.get("/campaigns/{campaign_id}/delivery-events", response_model=list[DeliveryEventOut])
async def list_delivery_events(campaign_id: str, db: AsyncSession = Depends(get_db)):
    return await service.list_delivery_events(db, campaign_id)
