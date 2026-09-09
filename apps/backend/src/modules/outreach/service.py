from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.middlewares.error_handler import BusinessRuleException, NotFoundException
from src.modules.outreach.audience_selector import select_audience_for_scheme
from src.modules.outreach.models import Audience, Campaign, CampaignStatus, DeliveryEvent
from src.modules.outreach.schemas import CampaignCreate
from src.modules.users.models import User


async def create_campaign(db: AsyncSession, payload: CampaignCreate, created_by: User) -> Campaign:
    campaign = Campaign(**payload.model_dump(), created_by=created_by.id)
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def get_campaign(db: AsyncSession, campaign_id: str) -> Campaign:
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundException("Campaign not found")
    return campaign


async def build_audience(db: AsyncSession, campaign_id: str) -> list[Audience]:
    campaign = await get_campaign(db, campaign_id)
    if not campaign.scheme_id:
        raise BusinessRuleException("Campaign has no linked scheme to build an eligibility-based audience from")
    selected = await select_audience_for_scheme(db, str(campaign.scheme_id))
    audience_records = []
    for beneficiary, reason in selected:
        record = Audience(campaign_id=campaign.id, beneficiary_id=beneficiary.id, selected_reason=reason)
        db.add(record)
        audience_records.append(record)
    await db.commit()
    for record in audience_records:
        await db.refresh(record)
    return audience_records


async def launch_campaign(db: AsyncSession, campaign_id: str):
    from src.jobs.outreach_jobs import send_campaign_messages

    campaign = await get_campaign(db, campaign_id)
    campaign.status = CampaignStatus.RUNNING
    await db.commit()
    send_campaign_messages.delay(str(campaign.id))
    return campaign


async def list_delivery_events(db: AsyncSession, campaign_id: str) -> list[DeliveryEvent]:
    result = await db.execute(select(DeliveryEvent).where(DeliveryEvent.campaign_id == campaign_id))
    return list(result.scalars().all())
