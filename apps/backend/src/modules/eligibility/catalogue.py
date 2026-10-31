"""Reviewed citizen catalogue. Archived training CSVs are never runtime authority."""
import copy
import json
from pathlib import Path
from urllib.parse import urlparse

CATALOGUE_PATH = Path(__file__).resolve().parents[2] / "data" / "verified_schemes.json"
# The government MSME source for NSSH explicitly links this implementing portal.
OFFICIAL_APPLICATION_HOSTS = {"scsthub.in", "www.scsthub.in"}


def load_catalogue() -> list[dict]:
    schemes = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))["schemes"]
    seen = set()
    for row in schemes:
        if row["slug"] in seen:
            raise ValueError("Duplicate verified catalogue identifier")
        seen.add(row["slug"])
        for field in ("official_url", "application_url"):
            url = urlparse(row[field])
            government_host = bool(url.hostname and url.hostname.endswith((".gov.in", ".nic.in")))
            approved_application_host = field == "application_url" and url.hostname in OFFICIAL_APPLICATION_HOSTS
            if url.scheme != "https" or not (government_host or approved_application_host) or url.username or url.password:
                raise ValueError("Verified catalogue requires an official HTTPS URL")
        if not row.get("criteria") or not row.get("verified_on") or not row.get("source_urls"):
            raise ValueError("Verified catalogue is missing provenance or screening criteria")
        row.update(scheme_id=row["slug"], name=row["scheme_name"], level="Central",
                   schemeCategory=row["category"], verification_status="official_guidance_reviewed")
    return copy.deepcopy(schemes)
