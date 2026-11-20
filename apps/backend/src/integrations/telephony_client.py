import httpx
from src.config.settings import settings
from src.config.logging import get_logger

logger = get_logger("telephony_client")


async def initiate_callback(phone_number: str) -> str | None:
    """Places an outbound call back to the beneficiary. Returns the
    provider's call SID on success, or None if the call could not be
    placed (caller should treat this as a retryable failure)."""
    if settings.TELEPHONY_PROVIDER == "twilio":
        return await _initiate_twilio_call(phone_number)
    if settings.TELEPHONY_PROVIDER == "exotel":
        return await _initiate_exotel_call(phone_number)
    logger.error("unknown_telephony_provider", provider=settings.TELEPHONY_PROVIDER)
    return None


async def _initiate_twilio_call(phone_number: str) -> str | None:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.warning("twilio_not_configured")
        return None
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Calls.json"
    data = {"To": phone_number, "From": settings.TWILIO_FROM_NUMBER, "Url": settings.TWILIO_VOICE_WEBHOOK_URL}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, data=data, auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN))
            response.raise_for_status()
            return response.json().get("sid")
    except httpx.HTTPError as exc:
        logger.error("twilio_call_failed", phone_number=phone_number, error=str(exc))
        return None


async def _initiate_exotel_call(phone_number: str) -> str | None:
    if not settings.EXOTEL_SID or not settings.EXOTEL_API_KEY or not settings.EXOTEL_API_TOKEN:
        logger.warning("exotel_not_configured")
        return None
    url = f"https://{settings.EXOTEL_SUBDOMAIN}/v1/Accounts/{settings.EXOTEL_SID}/Calls/connect.json"
    data = {"From": phone_number, "CallerId": settings.EXOTEL_CALLER_ID}
    if settings.EXOTEL_APP_ID:
        data["Url"] = f"http://my.exotel.com/{settings.EXOTEL_SID}/exoml/start_voice/{settings.EXOTEL_APP_ID}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, data=data, auth=(settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN))
            response.raise_for_status()
            payload = response.json()
            return payload.get("Call", {}).get("Sid")
    except httpx.HTTPError as exc:
        logger.error("exotel_call_failed", phone_number=phone_number, error=str(exc))
        return None
