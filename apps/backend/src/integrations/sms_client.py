import httpx
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("sms_client")


async def send_sms(phone_number: str, message: str) -> str | None:
    """Sends an SMS via the configured provider. Returns a provider message
    id on success, or None on failure (caller should log/retry, never crash
    the outreach job over one bad number)."""
    if settings.SMS_PROVIDER == "twilio":
        return await _send_twilio_sms(phone_number, message)
    if settings.SMS_PROVIDER == "msg91":
        return await _send_msg91_sms(phone_number, message)
    logger.error("unknown_sms_provider", provider=settings.SMS_PROVIDER)
    return None


async def _send_twilio_sms(phone_number: str, message: str) -> str | None:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("twilio_not_configured")
        return None
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    data = {"To": phone_number, "From": settings.TWILIO_FROM_NUMBER, "Body": message}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, data=data, auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN))
            response.raise_for_status()
            return response.json().get("sid")
    except httpx.HTTPError as exc:
        logger.error("twilio_sms_failed", phone_number=phone_number, error=str(exc))
        return None


async def _send_msg91_sms(phone_number: str, message: str) -> str | None:
    if not settings.MSG91_AUTH_KEY:
        logger.warning("msg91_not_configured")
        return None
    url = "https://control.msg91.com/api/v5/flow/"
    headers = {"authkey": settings.MSG91_AUTH_KEY, "Content-Type": "application/json"}
    payload = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "sender": settings.MSG91_SENDER_ID,
        "recipients": [{"mobiles": phone_number.lstrip("+"), "message": message}],
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json().get("requestId")
    except httpx.HTTPError as exc:
        logger.error("msg91_sms_failed", phone_number=phone_number, error=str(exc))
        return None
