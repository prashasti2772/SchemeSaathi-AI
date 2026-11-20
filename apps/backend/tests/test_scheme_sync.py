"""Tests for automated government scheme synchronization, deduplication, lifecycle and multi-store updates."""
import json
import os
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
import httpx
from starlette.testclient import TestClient

from src.main import app
from src.modules.schemes.sync.detector import SchemeChangeDetector
from src.modules.schemes.sync.engine import SchemeSyncEngine
from src.modules.schemes.sync.fetcher import (
    OfficialWebsiteHealthChecker,
    is_official_gov_url,
)
from src.modules.schemes.sync.indexer import SearchIndexSynchronizer
from src.modules.schemes.sync.schemas import (
    ChangeType,
    WebsiteStatus,
)
from src.modules.schemes.sync.synchronizer import (
    DatasetSynchronizer,
    parse_criteria_to_engine_row,
)
from src.modules.schemes.sync.validator import (
    SchemeValidator,
    canonical_url,
    normalize_title,
)
from src.jobs.scheme_sync_jobs import sync_government_schemes_task


def test_official_gov_url_validation():
    # Valid government URLs
    assert is_official_gov_url("https://pmkisan.gov.in/")
    assert is_official_gov_url("https://scholarships.gov.in/Students")
    assert is_official_gov_url("https://nha.gov.in/img/resources/faq.pdf")
    assert is_official_gov_url("https://subdomain.nic.in/portal")
    assert is_official_gov_url("https://scsthub.in/scheme")
    assert is_official_gov_url("https://www.scsthub.in/")

    # Invalid URLs (HTTP instead of HTTPS, non-gov domains, credentials)
    assert not is_official_gov_url("http://pmkisan.gov.in/")
    assert not is_official_gov_url("https://fakegov.com/")
    assert not is_official_gov_url("https://pmkisan.in/")
    assert not is_official_gov_url("https://user:pass@pmkisan.gov.in/")
    assert not is_official_gov_url("")
    assert not is_official_gov_url(None)


def test_duplicate_detection_and_merging():
    validator = SchemeValidator()

    existing = [
        {
            "slug": "pm-kisan",
            "scheme_name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
            "official_url": "https://www.pmkisan.gov.in/",
            "benefits": "Rs 6,000 per year",
            "eligibility": "Landholding farmer families",
            "category": "Agriculture",
            "description": "Income support for farmers",
        }
    ]

    # Duplicate candidate with slight title variation and query params
    candidate_dup1 = {
        "slug": "pmkisan-income-scheme",
        "scheme_name": "PM-KISAN - Pradhan Mantri Kisan Samman Nidhi",
        "official_url": "https://www.pmkisan.gov.in/?utm_source=portal",
        "benefits": "Rs 6,000 in three installments with Direct Benefit Transfer",
        "eligibility": "Landholding farmer families identified by State/UT",
        "category": "Agriculture",
        "description": "Income support for farmers",
    }

    dup_found = validator.find_duplicate(candidate_dup1, existing)
    assert dup_found is not None
    canon, reason = dup_found
    assert canon["slug"] == "pm-kisan"

    # Merge records
    merged = validator.merge_scheme_records(canon, candidate_dup1)
    assert "Direct Benefit Transfer" in merged["benefits"]
    assert merged["slug"] == "pm-kisan"


def test_lifecycle_detection_new_updated_expired_closed():
    detector = SchemeChangeDetector(reference_date=date(2026, 11, 20))

    existing = {
        "slug": "sample-welfare",
        "scheme_name": "Sample Welfare Scheme",
        "category": "Education",
        "description": "Existing text",
        "benefits": "Rs 10,000 allowance",
        "eligibility": "Annual income up to Rs 3 lakh",
        "documents": "Income certificate",
        "application_process": "Apply via state portal",
        "official_url": "https://welfare.gov.in/",
    }

    # 1. New Scheme
    new_scheme = {
        "slug": "new-solar-scheme",
        "scheme_name": "PM Surya Ghar Free Electricity Scheme",
        "category": "Energy",
        "description": "Solar rooftop subsidy",
        "benefits": "Up to Rs 78,000 subsidy",
        "eligibility": "Indian citizens with suitable rooftop",
        "official_url": "https://pmsuryaghar.gov.in/",
    }
    item_new = detector.evaluate_scheme_change(new_scheme, existing=None)
    assert item_new.change_type == ChangeType.ADDED

    # 2. Updated Scheme (Benefit increased to 15,000, income cap changed)
    updated_scheme = dict(existing)
    updated_scheme["benefits"] = "Rs 15,000 allowance"
    updated_scheme["eligibility"] = "Annual income up to Rs 4.5 lakh"
    item_updated = detector.evaluate_scheme_change(updated_scheme, existing=existing)
    assert item_updated.change_type == ChangeType.UPDATED
    assert "benefits" in item_updated.field_diffs
    assert "eligibility" in item_updated.field_diffs
    assert item_updated.field_diffs["benefits"]["new"] == "Rs 15,000 allowance"

    # 3. Expired Scheme (Deadline passed)
    expired_scheme = dict(existing)
    expired_scheme["valid_until"] = "2026-03-31"  # before Nov 20, 2026
    item_exp = detector.evaluate_scheme_change(expired_scheme, existing=existing)
    assert item_exp.change_type == ChangeType.EXPIRED

    # 4. Closed / Discontinued Scheme
    closed_scheme = dict(existing)
    closed_scheme["status"] = "discontinued"
    closed_scheme["description"] = "This scheme was discontinued and subsumed under a new mission."
    item_closed = detector.evaluate_scheme_change(closed_scheme, existing=existing)
    assert item_closed.change_type == ChangeType.CLOSED


@pytest.mark.asyncio
async def test_temporarily_unavailable_website_does_not_deactivate_scheme(monkeypatch):
    """
    HTTP 503 / network timeout must mark TEMPORARILY_UNAVAILABLE
    without deactivating or dropping the scheme from the dataset.
    """
    checker = OfficialWebsiteHealthChecker(timeout=2.0, max_retries=1, backoff_factor=0.01)

    async def fake_head_error(url):
        raise httpx.ConnectTimeout("Connection timed out to gov portal")

    mock_client = SimpleNamespace(
        head=fake_head_error,
        get=fake_head_error,
    )

    report = await checker.check_url("https://pmkisan.gov.in/", client=mock_client)
    assert report.status == WebsiteStatus.TEMPORARILY_UNAVAILABLE
    assert "ConnectTimeout" in (report.error_message or "")


def test_parse_criteria_to_engine_row():
    scheme = {
        "scheme_name": "Ayushman Bharat PM-JAY Senior Citizens",
        "category": "Healthcare",
        "eligibility": "Age 70 or above as recorded in Aadhaar.",
        "criteria": [
            {"field": "age", "operator": "gte", "value": 70, "label": "Age at least 70"}
        ]
    }
    row = parse_criteria_to_engine_row(scheme)
    assert row["Scheme Name"] == "Ayushman Bharat PM-JAY Senior Citizens"
    assert row["Age Range"] == ">=70"
    assert row["Eligible Categories"] == "ANY"


@pytest.mark.asyncio
async def test_full_pipeline_sync_isolated_files():
    """
    Tests the complete end-to-end sync engine in an isolated temporary directory:
    Fetch -> Validate -> Detect -> Multi-store Sync (JSON, CSVs) -> Indexer -> Audit Log.
    """
    with tempfile.TemporaryDirectory(prefix="schemesathi-sync-test-") as temp_dir:
        temp_path = Path(temp_dir)
        catalogue_file = temp_path / "verified_schemes.json"
        myscheme_csv = temp_path / "myscheme.csv"
        eligibility_csv = temp_path / "all_schemes_eligibility_table.csv"
        audit_log = temp_path / "audit.jsonl"

        # Baseline seed
        seed_data = {
            "version": "2026-10-31",
            "verification_scope": "Test baseline",
            "schemes": [
                {
                    "slug": "baseline-scholarship",
                    "scheme_name": "National Scholarship Scheme",
                    "category": "Education",
                    "department": "Ministry of Education",
                    "description": "Baseline scholarship",
                    "benefits": "Rs 10,000",
                    "eligibility": "Class 12 pass",
                    "documents": "Marksheet",
                    "application_process": "Apply on NSP",
                    "official_url": "https://scholarships.gov.in/",
                    "application_url": "https://scholarships.gov.in/",
                    "verified_on": "2026-10-28",
                    "criteria": [{"field": "annual_income", "operator": "lte", "value": 300000}],
                    "status": "active"
                }
            ]
        }
        catalogue_file.write_text(json.dumps(seed_data), encoding="utf-8")

        # Incoming batch: 1 update, 1 new scheme, 1 duplicate
        incoming_feed = [
            # Updated version of baseline-scholarship (income limit increased, benefits raised)
            {
                "slug": "baseline-scholarship",
                "scheme_name": "National Scholarship Scheme",
                "category": "Education",
                "department": "Ministry of Education",
                "description": "Enhanced scholarship program",
                "benefits": "Rs 15,000",
                "eligibility": "Class 12 pass, annual income up to Rs 4.5 lakh",
                "documents": "Marksheet, Income certificate",
                "application_process": "Apply on NSP portal",
                "official_url": "https://scholarships.gov.in/",
                "application_url": "https://scholarships.gov.in/",
                "verified_on": "2026-11-20",
                "criteria": [{"field": "annual_income", "operator": "lte", "value": 450000}],
            },
            # Newly added scheme
            {
                "slug": "pm-surya-ghar",
                "scheme_name": "PM Surya Ghar Muft Bijli Yojana",
                "category": "Energy",
                "department": "Ministry of New and Renewable Energy",
                "description": "Rooftop solar electricity subsidy",
                "benefits": "Subsidy up to Rs 78,000 for residential rooftop solar",
                "eligibility": "Citizens with grid-connected electricity and rooftop space",
                "documents": "Electricity bill, Identity proof",
                "application_process": "Register on the national portal pmsuryaghar.gov.in",
                "official_url": "https://pmsuryaghar.gov.in/",
                "application_url": "https://pmsuryaghar.gov.in/",
                "verified_on": "2026-11-20",
                "criteria": [],
            },
            # Duplicate of pm-surya-ghar (should be detected and merged)
            {
                "slug": "pmsuryaghar-duplicate",
                "scheme_name": "PM Surya Ghar: Free Electricity Solar Scheme",
                "category": "Energy",
                "department": "Ministry of New and Renewable Energy",
                "description": "Duplicate solar entry",
                "benefits": "Subsidy up to Rs 78,000 with low-interest bank loan support",
                "eligibility": "Residential households",
                "documents": "Electricity bill",
                "application_process": "Apply online",
                "official_url": "https://pmsuryaghar.gov.in/?ref=portal",
                "application_url": "https://pmsuryaghar.gov.in/",
                "verified_on": "2026-11-20",
            }
        ]

        engine = SchemeSyncEngine(
            catalogue_path=catalogue_file,
            myscheme_csv_path=myscheme_csv,
            eligibility_csv_path=eligibility_csv,
            audit_log_path=audit_log,
        )

        summary = await engine.execute_sync(
            source_feed=incoming_feed,
            dry_run=False,
            rebuild_embeddings=False,  # Skip heavy neural encoder in quick test
            check_website_health=False,
        )

        assert summary.status == "completed"
        assert summary.added_count == 1
        assert summary.updated_count == 1
        assert summary.duplicate_count == 1

        # Verify verified_schemes.json updated
        updated_doc = json.loads(catalogue_file.read_text(encoding="utf-8"))
        slugs = {s["slug"] for s in updated_doc["schemes"]}
        assert "pm-surya-ghar" in slugs
        assert "baseline-scholarship" in slugs
        assert "pmsuryaghar-duplicate" not in slugs  # Duplicate avoided!

        # Check merged benefit
        solar = next(s for s in updated_doc["schemes"] if s["slug"] == "pm-surya-ghar")
        assert "low-interest bank loan support" in solar["benefits"]

        # Verify CSVs exist and contain schemes
        assert myscheme_csv.exists()
        assert eligibility_csv.exists()
        csv_text = myscheme_csv.read_text(encoding="utf-8")
        assert "pm-surya-ghar" in csv_text
        assert "National Scholarship Scheme" in csv_text

        # Verify audit log was written
        assert audit_log.exists()
        history = engine.auditor.get_recent_history(limit=10)
        assert len(history) > 0


def test_api_sync_endpoints(monkeypatch):
    """Tests /schemes/sync, /schemes/sync/status, /schemes/sync/history via TestClient."""
    from src.config.settings import settings
    from src.modules.schemes.router import router as schemes_router
    from src.middlewares.rbac_middleware import require_admin, require_any_staff
    from src.modules.users.models import User, UserRole

    monkeypatch.setattr(settings, "ENABLE_STAFF_API", True)
    # Ensure router is registered for this test
    app.include_router(schemes_router, prefix=settings.API_V1_PREFIX)

    admin_user = User(
        email="admin@schemesaathi.gov.in",
        full_name="Admin Test",
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )

    app.dependency_overrides[require_admin] = lambda: admin_user
    app.dependency_overrides[require_any_staff] = lambda: admin_user

    try:
        client = TestClient(app)

        # 1. Check sync status
        res = client.get("/api/v1/schemes/sync/status")
        assert res.status_code == 200
        status_data = res.json()
        assert "is_running" in status_data

        # 2. Trigger dry-run sync
        dry_req = {"dry_run": True, "rebuild_embeddings": False}
        res_dry = client.post("/api/v1/schemes/sync", json=dry_req)
        assert res_dry.status_code == 200
        dry_data = res_dry.json()
        assert dry_data["dry_run"] is True
        assert dry_data["status"] == "completed"

        # 3. Check history
        res_hist = client.get("/api/v1/schemes/sync/history")
        assert res_hist.status_code == 200
        assert isinstance(res_hist.json(), list)

        # 4. Check markdown report
        res_rep = client.get("/api/v1/schemes/sync/report")
        assert res_rep.status_code == 200
        assert "report" in res_rep.json()
    finally:
        app.dependency_overrides.pop(require_admin, None)
        app.dependency_overrides.pop(require_any_staff, None)


def test_celery_task_execution():
    """Tests Celery task synchronous invocation for background worker compatibility."""
    result = sync_government_schemes_task(dry_run=True, rebuild_embeddings=False)
    assert result["status"] == "completed"
    assert "sync_id" in result
