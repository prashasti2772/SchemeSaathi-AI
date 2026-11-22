"""Reviewed citizen catalogue. Archived training CSVs are never runtime authority."""
import copy
import csv
import json
import re
from pathlib import Path
from urllib.parse import urlparse

CATALOGUE_PATH = Path(__file__).resolve().parents[2] / "data" / "verified_schemes.json"
SCHEME_CSV_PATH = Path(__file__).resolve().parents[2] / "ml" / "chatbot" / "myscheme.csv"
# The government MSME source for NSSH explicitly links this implementing portal.
OFFICIAL_APPLICATION_HOSTS = {"scsthub.in", "www.scsthub.in"}


def _normalize_scheme_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").casefold())


def _load_csv_application_routes() -> tuple[dict[str, str], dict[str, str]]:
    if not SCHEME_CSV_PATH.exists():
        return {}, {}

    routes_by_slug = {}
    routes_by_name = {}
    with SCHEME_CSV_PATH.open("r", encoding="utf-8-sig", errors="ignore", newline="") as csv_file:
        for row in csv.DictReader(csv_file):
            application = str(
                row.get("how to apply")
                or row.get("application")
                or row.get("application_process")
                or ""
            ).strip()
            if not application:
                continue
            slug = _normalize_scheme_key(row.get("slug"))
            name = _normalize_scheme_key(row.get("scheme_name"))
            if slug:
                routes_by_slug.setdefault(slug, application)
            if name:
                routes_by_name.setdefault(name, application)
    return routes_by_slug, routes_by_name


def load_catalogue() -> list[dict]:
    schemes = json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))["schemes"]
    routes_by_slug, routes_by_name = _load_csv_application_routes()
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
        csv_application = (
            routes_by_slug.get(_normalize_scheme_key(row["slug"]))
            or routes_by_name.get(_normalize_scheme_key(row["scheme_name"]))
        )
        if csv_application:
            row["application_process"] = csv_application
        row.update(scheme_id=row["slug"], name=row["scheme_name"], level="Central",
                   schemeCategory=row["category"], verification_status="official_guidance_reviewed")
    return copy.deepcopy(schemes)
