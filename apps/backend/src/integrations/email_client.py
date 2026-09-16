"""Brevo HTTPS transactional email delivery.

Recipients, API keys, message bodies and OTPs are deliberately absent from
application logs.
"""
import httpx
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("email_client")


def log_configuration() -> None:
    """Report missing deployment settings without printing their values."""
    if not email_ready():
        logger.warning("email_not_configured", provider="brevo", reason="missing_brevo_settings")


def _failure_reason(response: httpx.Response) -> str:
    """Classify known errors; never log arbitrary provider text or request URLs."""
    try:
        data = response.json()
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    if response.status_code in {401, 403}:
        return "api_key_rejected"
    if response.status_code == 429:
        return "rate_limited"
    if response.status_code >= 500:
        return "provider_unavailable"
    return "request_rejected"


def email_ready() -> bool:
    return bool(settings.BREVO_API_KEY and settings.EMAIL_FROM_ADDRESS)


async def send_email(to_address: str, subject: str, body: str) -> bool:
    if not email_ready():
        logger.warning("email_not_configured")
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json",
                },
                json={
                    "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM_ADDRESS},
                    "to": [{"email": to_address}],
                    "subject": subject,
                    "textContent": body,
                },
            )
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict) or not isinstance(data.get("messageId"), str) or not data["messageId"]:
                raise ValueError("Missing delivery acknowledgement")
            logger.info("email_provider_accepted", provider="brevo")
            return True
    except httpx.HTTPStatusError as error:
        logger.warning("email_delivery_failed", provider="brevo", reason=_failure_reason(error.response), status=error.response.status_code)
        return False
    except httpx.TimeoutException:
        reason = "provider_timeout"
    except httpx.HTTPError:
        reason = "network_error"
    except OSError:
        reason = "network_error"
    except ValueError:
        reason = "invalid_provider_response"
    logger.warning("email_delivery_failed", provider="brevo", reason=reason)
    return False
