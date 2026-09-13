"""Credential-gated email delivery. Never log recipients, credentials or OTPs."""
import asyncio
from email.message import EmailMessage
import smtplib
import ssl

import httpx
from src.config.settings import settings
from src.integrations import google_bridge
from src.config.logging import get_logger

logger = get_logger("email_client")


def email_ready() -> bool:
    if not settings.EMAIL_FROM_ADDRESS:
        return False
    if settings.EMAIL_PROVIDER == "apps_script":
        return google_bridge.ready()
    if settings.EMAIL_PROVIDER == "resend":
        return bool(settings.RESEND_API_KEY and settings.EMAIL_FROM_ADDRESS)
    if settings.EMAIL_PROVIDER == "smtp":
        return bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD)
    return False


def _send_smtp(to_address: str, subject: str, body: str) -> bool:
    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM_ADDRESS
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)
    context = ssl.create_default_context()
    if settings.SMTP_USE_SSL:
        connection = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10, context=context)
    else:
        connection = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
    with connection as client:
        if not settings.SMTP_USE_SSL:
            client.ehlo()
            client.starttls(context=context)
            client.ehlo()
        client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        return not client.send_message(message)


async def send_email(to_address: str, subject: str, body: str) -> bool:
    if not email_ready():
        logger.warning("email_not_configured")
        return False
    try:
        if settings.EMAIL_PROVIDER == "apps_script":
            await google_bridge.call({"kind": "email", "sender": settings.EMAIL_FROM_ADDRESS, "to": to_address, "subject": subject, "body": body})
            return True
        if settings.EMAIL_PROVIDER == "smtp":
            return await asyncio.to_thread(_send_smtp, to_address, subject, body)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": "Bearer " + settings.RESEND_API_KEY},
                json={"from": settings.EMAIL_FROM_ADDRESS, "to": [to_address], "subject": subject, "text": body},
            )
            response.raise_for_status()
            return bool(response.json().get("id"))
    except (httpx.HTTPError, smtplib.SMTPException, OSError, ValueError):
        logger.warning("email_delivery_failed", provider=settings.EMAIL_PROVIDER)
        return False
