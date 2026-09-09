import asyncio
from src.config.database import AsyncSessionLocal
from src.config.logging import get_logger
from src.integrations.email_client import send_email
from src.integrations.sms_client import send_sms
from src.jobs.celery_app import celery_app
from src.modules.notifications.models import NotificationChannel, NotificationStatus

logger = get_logger("notification_jobs")


@celery_app.task(name="notifications.send", bind=True, max_retries=3, default_retry_delay=15)
def send_notification(self, notification_log_id: str, context: dict) -> None:
    try:
        asyncio.run(_send_notification(notification_log_id, context))
    except Exception as exc:
        logger.error("notification_send_failed", notification_log_id=notification_log_id, error=str(exc))
        raise self.retry(exc=exc)


async def _send_notification(notification_log_id: str, context: dict) -> None:
    from sqlalchemy import select
    from src.modules.beneficiaries.models import Beneficiary
    from src.modules.notifications.models import NotificationLog
    from src.modules.users.models import User

    async with AsyncSessionLocal() as db:
        log_entry = (await db.execute(select(NotificationLog).where(NotificationLog.id == notification_log_id))).scalar_one_or_none()
        if not log_entry:
            return

        message = context.get("message", log_entry.template)
        delivered = False

        if log_entry.channel == NotificationChannel.SMS and log_entry.beneficiary_id:
            beneficiary = (await db.execute(select(Beneficiary).where(Beneficiary.id == log_entry.beneficiary_id))).scalar_one_or_none()
            if beneficiary:
                message_id = await send_sms(beneficiary.phone_number, message)
                log_entry.provider_message_id = message_id
                delivered = bool(message_id)

        elif log_entry.channel == NotificationChannel.EMAIL and log_entry.user_id:
            user = (await db.execute(select(User).where(User.id == log_entry.user_id))).scalar_one_or_none()
            if user:
                delivered = await send_email(user.email, log_entry.template, message)

        log_entry.status = NotificationStatus.SENT if delivered else NotificationStatus.FAILED
        await db.commit()
