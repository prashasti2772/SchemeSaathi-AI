import asyncio
from src.config.database import AsyncSessionLocal
from src.config.logging import get_logger
from src.integrations.sms_client import send_sms
from src.jobs.celery_app import celery_app

logger = get_logger("outreach_jobs")


@celery_app.task(name="outreach.send_campaign_messages", bind=True, max_retries=3, default_retry_delay=30)
def send_campaign_messages(self, campaign_id: str) -> None:
    try:
        asyncio.run(_send_campaign_messages(campaign_id))
    except Exception as exc:
        logger.error("send_campaign_messages_failed", campaign_id=campaign_id, error=str(exc))
        raise self.retry(exc=exc)


async def _send_campaign_messages(campaign_id: str) -> None:
    from sqlalchemy import select
    from src.modules.outreach.models import Audience, Campaign, DeliveryEvent, DeliveryStatus
    from src.modules.beneficiaries.models import Beneficiary

    async with AsyncSessionLocal() as db:
        campaign = (await db.execute(select(Campaign).where(Campaign.id == campaign_id))).scalar_one_or_none()
        if not campaign:
            return
        audience = (await db.execute(select(Audience).where(Audience.campaign_id == campaign_id))).scalars().all()

        for entry in audience:
            beneficiary = (await db.execute(select(Beneficiary).where(Beneficiary.id == entry.beneficiary_id))).scalar_one_or_none()
            if not beneficiary:
                continue
            message_id = await send_sms(beneficiary.phone_number, campaign.message_template)
            status = DeliveryStatus.SENT if message_id else DeliveryStatus.FAILED
            db.add(DeliveryEvent(
                campaign_id=campaign.id,
                beneficiary_id=beneficiary.id,
                channel="sms",
                status=status,
                provider_message_id=message_id,
            ))
        await db.commit()
