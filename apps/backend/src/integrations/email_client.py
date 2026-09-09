import httpx
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("email_client")


async def send_email(to_address: str, subject: str, body: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.sendgrid.com/v3/mail/send" if settings.EMAIL_PROVIDER == "ses" else "https://api.resend.com/emails",
                json={"from": settings.EMAIL_FROM_ADDRESS, "to": to_address, "subject": subject, "body": body},
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError as exc:
        logger.error("email_send_failed", to_address=to_address, error=str(exc))
        return False
