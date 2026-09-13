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
        logger.error("twilio_sms_failed")
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
        logger.error("msg91_sms_failed")
        return None


def otp_sms_ready() -> bool:
    return bool(settings.SMS_PROVIDER == "msg91" and settings.MSG91_AUTH_KEY and settings.MSG91_OTP_TEMPLATE_ID and settings.MSG91_SENDER_ID)


async def send_reset_otp(phone_number: str, code: str) -> bool:
    """Send our generated OTP using the configured MSG91 OTP Flow template.

    The approved Flow template must contain ##otp##. Secrets and codes are
    confined to headers/body, never URLs or application logs.
    """
    import re
    if not otp_sms_ready() or not re.fullmatch(r"[6-9][0-9]{9}", phone_number) or not re.fullmatch(r"[0-9]{6}", code):
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.msg91.com/api/v5/flow/",
                headers={"authkey": settings.MSG91_AUTH_KEY},
                json={"flow_id": settings.MSG91_OTP_TEMPLATE_ID, "sender": settings.MSG91_SENDER_ID,
                      "recipients": [{"mobiles": "91" + phone_number, "otp": code}]},
            )
            response.raise_for_status()
            return response.json().get("type") == "success"
    except (httpx.HTTPError, ValueError):
        logger.warning("password_reset_sms_delivery_failed")
        return False
