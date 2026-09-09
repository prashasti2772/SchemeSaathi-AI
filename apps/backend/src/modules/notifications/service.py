from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.notifications.models import NotificationLog, NotificationStatus
from src.modules.notifications.schemas import NotificationSendRequest


async def queue_notification(db: AsyncSession, payload: NotificationSendRequest) -> NotificationLog:
    log_entry = NotificationLog(
        beneficiary_id=payload.beneficiary_id,
        user_id=payload.user_id,
        channel=payload.channel,
        template=payload.template,
        status=NotificationStatus.QUEUED,
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    from src.jobs.notification_jobs import send_notification

    send_notification.delay(str(log_entry.id), payload.context)
    return log_entry


async def list_logs_for_beneficiary(db: AsyncSession, beneficiary_id: str) -> list[NotificationLog]:
    result = await db.execute(select(NotificationLog).where(NotificationLog.beneficiary_id == beneficiary_id))
    return list(result.scalars().all())
