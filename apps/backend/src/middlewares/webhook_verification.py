import base64
import hashlib
import hmac
from fastapi import Header, Request
from src.config.settings import settings
from src.middlewares.error_handler import UnauthorizedException


async def verify_telephony_webhook(request: Request, x_twilio_signature: str | None = Header(default=None)) -> None:
    """Verifies inbound telephony webhooks so attackers can't forge missed-call
    or call-status events. Twilio uses its own signed-URL scheme; other
    providers (Exotel etc.) are checked against a shared secret over the
    raw request body, which the provider must be configured to send back."""
    if settings.TELEPHONY_PROVIDER == "twilio":
        await _verify_twilio_signature(request, x_twilio_signature)
        return
    await _verify_shared_secret_signature(request)


async def _verify_twilio_signature(request: Request, signature: str | None) -> None:
    if not settings.TWILIO_AUTH_TOKEN:
        return
    if not signature:
        raise UnauthorizedException("Missing Twilio webhook signature")
    form = await request.form()
    full_url = str(request.url)
    sorted_params = "".join(f"{key}{value}" for key, value in sorted(form.items()))
    digest = hmac.new(settings.TWILIO_AUTH_TOKEN.encode(), (full_url + sorted_params).encode(), hashlib.sha1).digest()
    expected = base64.b64encode(digest).decode()
    if not hmac.compare_digest(expected, signature):
        raise UnauthorizedException("Webhook signature verification failed")


async def _verify_shared_secret_signature(request: Request) -> None:
    if not settings.WEBHOOK_SHARED_SECRET:
        return
    provided = request.headers.get("x-webhook-signature")
    if not provided:
        raise UnauthorizedException("Missing webhook signature")
    raw_body = await request.body()
    expected = hmac.new(settings.WEBHOOK_SHARED_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, provided):
        raise UnauthorizedException("Webhook signature verification failed")
