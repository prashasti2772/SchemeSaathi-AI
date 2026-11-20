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


def _send_smtp_sync(to_address: str, subject: str, body: str) -> bool:
    import smtplib
    from email.message import EmailMessage

    msg = EmailMessage()
    from_addr = settings.EMAIL_FROM_ADDRESS or settings.SMTP_USER
    from_name = settings.EMAIL_FROM_NAME or "SchemeSaathi Support"
    msg["From"] = f"{from_name} <{from_addr}>"
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)

    host = settings.SMTP_HOST or "smtp.gmail.com"
    user = (settings.SMTP_USER or "").strip()
    password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
    ports_to_try = [settings.SMTP_PORT or 587]
    if 465 not in ports_to_try:
        ports_to_try.append(465)

    last_error = None
    for port in ports_to_try:
        try:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=12)
            else:
                server = smtplib.SMTP(host, port, timeout=12)
                if settings.SMTP_USE_TLS:
                    server.starttls()
            if user and password:
                server.login(user, password)
            server.send_message(msg)
            server.quit()
            logger.info("smtp_email_sent", recipient=to_address, subject=subject, port=port)
            return True
        except Exception as exc:
            last_error = exc
            print(f"[SMTP WARNING] Port {port} delivery failed: {type(exc).__name__}: {exc}", flush=True)

    print(f"\n[SMTP ERROR] All email delivery attempts failed: {type(last_error).__name__}: {last_error}", flush=True)
    print(f"[SMTP ERROR] To enable instant sign-in without SMTP, set EMAIL_PROVIDER=mock in Render environment variables.\n", flush=True)
    logger.warning("smtp_delivery_failed", error=str(last_error))
    return False


def email_ready() -> bool:
    provider = (settings.EMAIL_PROVIDER or "").lower()
    if provider in {"mock", "console", "test", "local"}:
        return True
    if provider in {"smtp", "gmail"} or (settings.SMTP_USER and settings.SMTP_PASSWORD):
        return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
    return bool(settings.BREVO_API_KEY and settings.EMAIL_FROM_ADDRESS)


async def send_email(to_address: str, subject: str, body: str) -> bool:
    provider = (settings.EMAIL_PROVIDER or "").lower()
    if provider in {"mock", "console", "test", "local"}:
        logger.info("email_mock_delivered", recipient=to_address, subject=subject)
        print("\n" + "=" * 60, flush=True)
        print(f" [DEV EMAIL / OTP DELIVERY - {provider.upper()}]", flush=True)
        print(f" To: {to_address}", flush=True)
        print(f" From: {settings.EMAIL_FROM_ADDRESS}", flush=True)
        print(f" Subject: {subject}", flush=True)
        print("-" * 60, flush=True)
        print(body, flush=True)
        print("=" * 60 + "\n", flush=True)
        return True

    if provider in {"smtp", "gmail"} or (settings.SMTP_USER and settings.SMTP_PASSWORD):
        import asyncio
        return await asyncio.to_thread(_send_smtp_sync, to_address, subject, body)

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
