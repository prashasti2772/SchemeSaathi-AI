"""Official sources fetcher and website health checker with retry & exponential backoff."""
import asyncio
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx

from src.config.logging import get_logger
from src.modules.schemes.sync.schemas import WebsiteHealthReport, WebsiteStatus

logger = get_logger("scheme_sync.fetcher")

# Government approved official domains
APPROVED_DOMAINS = (".gov.in", ".nic.in", "scsthub.in", "www.scsthub.in")


def is_official_gov_url(url_str: str) -> bool:
    """Verifies that a URL uses HTTPS and belongs to an approved government domain."""
    if not url_str or not isinstance(url_str, str):
        return False
    try:
        parsed = urlparse(url_str.strip())
        if parsed.scheme != "https":
            return False
        if parsed.username or parsed.password:
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        return any(hostname == domain or hostname.endswith(domain) for domain in APPROVED_DOMAINS)
    except Exception:
        return False


class OfficialWebsiteHealthChecker:
    """
    Checks the reachability of official government scheme portals.
    Distinguishes temporary outages (5xx, timeouts) from permanent closures (404, 410).
    """

    def __init__(self, timeout: float = 8.0, max_retries: int = 2, backoff_factor: float = 0.5):
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor

    async def check_url(
        self,
        url: str,
        client: Optional[httpx.AsyncClient] = None,
        existing_failures: int = 0
    ) -> WebsiteHealthReport:
        """Checks a single URL with retries for transient errors."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SchemeSaathi-AI/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        should_close = False
        if client is None:
            client = httpx.AsyncClient(headers=headers, timeout=self.timeout, follow_redirects=True, verify=False)
            should_close = True

        last_error = None
        status_code = None

        try:
            for attempt in range(self.max_retries + 1):
                try:
                    # Attempt a HEAD first, then fallback to GET if method not allowed
                    response = await client.head(url)
                    if response.status_code == 405:  # Method Not Allowed
                        response = await client.get(url)

                    status_code = response.status_code
                    if 200 <= status_code < 400:
                        return WebsiteHealthReport(
                            url=url,
                            status=WebsiteStatus.HEALTHY,
                            status_code=status_code,
                            consecutive_failures=0,
                        )
                    elif status_code in (404, 410):
                        return WebsiteHealthReport(
                            url=url,
                            status=WebsiteStatus.PERMANENTLY_CLOSED,
                            status_code=status_code,
                            consecutive_failures=existing_failures + 1,
                            error_message=f"HTTP {status_code} - Resource not found",
                        )
                    elif status_code in (500, 502, 503, 504, 429):
                        # Server temporary error or rate limit
                        last_error = f"HTTP {status_code} Temporary Server Error"
                    else:
                        last_error = f"HTTP {status_code}"

                except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as err:
                    last_error = f"{type(err).__name__}: {str(err)}"

                if attempt < self.max_retries:
                    await asyncio.sleep(self.backoff_factor * (2 ** attempt))

            # If all retries failed with transient errors:
            logger.warning("official_url_temporarily_unavailable", url=url, error=last_error)
            return WebsiteHealthReport(
                url=url,
                status=WebsiteStatus.TEMPORARILY_UNAVAILABLE,
                status_code=status_code,
                consecutive_failures=existing_failures + 1,
                error_message=last_error,
            )

        finally:
            if should_close:
                await client.aclose()


class OfficialSchemeFetcher:
    """Fetches schemes and updates from official sources or custom endpoint fixtures."""

    def __init__(self, health_checker: Optional[OfficialWebsiteHealthChecker] = None):
        self.health_checker = health_checker or OfficialWebsiteHealthChecker()

    async def fetch_source_feed(self, source_url_or_path: str) -> List[Dict[str, Any]]:
        """
        Fetches raw scheme records from an official API, JSON feed, or local snapshot.
        """
        import json
        from pathlib import Path

        # If it is a local path (e.g. mock or test snapshot)
        path = Path(source_url_or_path)
        if path.exists() and path.is_file():
            content = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(content, dict) and "schemes" in content:
                return content["schemes"]
            if isinstance(content, list):
                return content
            return []

        # If it's a remote URL:
        if source_url_or_path.startswith("http://") or source_url_or_path.startswith("https://"):
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                resp = await client.get(source_url_or_path)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and "schemes" in data:
                    return data["schemes"]
                if isinstance(data, list):
                    return data
                return []

        return []

    async def verify_scheme_health(
        self, scheme_dict: Dict[str, Any], client: Optional[httpx.AsyncClient] = None
    ) -> Tuple[WebsiteHealthReport, Optional[WebsiteHealthReport]]:
        """
        Checks reachability of official_url and application_url.
        """
        official_url = scheme_dict.get("official_url") or ""
        application_url = scheme_dict.get("application_url") or ""

        official_rep = await self.health_checker.check_url(official_url, client=client) if official_url else None
        app_rep = await self.health_checker.check_url(application_url, client=client) if application_url else None

        return official_rep, app_rep
