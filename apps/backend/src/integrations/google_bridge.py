"""Signed HTTPS requests to the owner's Google Apps Script web app."""
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlsplit
import httpx
from src.config.settings import settings


def ready():
    url = urlsplit(settings.APPS_SCRIPT_URL)
    return bool(url.scheme == "https" and url.hostname == "script.google.com" and url.path.endswith("/exec") and len(settings.APPS_SCRIPT_SECRET) >= 32)


async def call(payload):
    if not ready():
        raise ValueError("Google bridge unavailable")
    payload = json.dumps({**payload, "timestamp": int(time.time()), "nonce": secrets.token_urlsafe(24)}, ensure_ascii=False, separators=(",", ":"))
    signature = hmac.new(settings.APPS_SCRIPT_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
        response = await client.post(settings.APPS_SCRIPT_URL, json={"payload": payload, "signature": signature})
        # Apps Script ContentService redirects to a one-time Google result URL.
        if response.status_code in (302, 303):
            target = response.headers.get("location", "")
            url = urlsplit(target)
            if url.scheme != "https" or url.hostname != "script.googleusercontent.com":
                raise ValueError("Untrusted response redirect")
            response = await client.get(target)
        response.raise_for_status()
        result = response.json()
    if not isinstance(result, dict) or result.get("ok") is not True:
        raise ValueError("Google bridge rejected request")
    return result
