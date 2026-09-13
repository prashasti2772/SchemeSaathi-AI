"""Public catalogue localization tests use synthetic translations, never paid APIs."""
import asyncio
import json

import httpx
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from src.modules.eligibility import localization as loc


@pytest.fixture(autouse=True)
def no_live_provider(monkeypatch):
    for key in ["GEMINI_API_KEY", "CHATBOT_API_KEY", "BHASHINI_USER_ID", "BHASHINI_API_KEY"]:
        monkeypatch.setattr(loc.settings, key, "")


def with_database(action):
    async def run():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with engine.begin() as conn:
            await conn.run_sync(loc.CatalogueTranslation.__table__.create)
        session = async_sessionmaker(engine, expire_on_commit=False)
        async with session() as db:
            await action(db)
        await engine.dispose()
    asyncio.run(run())


def test_localization_caches_public_fields_and_keeps_decisions_and_urls(monkeypatch):
    calls = []
    monkeypatch.setattr(loc.settings, "GEMINI_API_KEY", "synthetic-key")
    async def translate(texts, source, target):
        calls.append(texts)
        return ["हिंदी " + text for text in texts]
    monkeypatch.setattr(loc, "translate_batch", translate)
    original = {"scheme_name": "Enterprise loan", "description": "Loan support up to 50,000.",
                "required_documents": ["Business plan"], "scheme_id": "enterprise-loan",
                "official_source_url": "https://example.gov.in/apply", "score": 0.85,
                "is_eligible": True, "detailed_explanation": {"Income": {"value": 123456}}}
    async def check(db):
        result = (await loc.localize_records(db, [original], "hi"))[0]
        assert result["scheme_name"] == "हिंदी Enterprise loan"
        assert result["translation_status"] == "translated"
        for field in ["score", "is_eligible", "official_source_url", "scheme_id", "detailed_explanation"]:
            assert result[field] == original[field]
        assert "123456" not in str(calls)
        again = (await loc.localize_records(db, [original], "hi"))[0]
        assert result == again and len(calls) == 1
        assert original["scheme_name"] == "Enterprise loan"
        await loc.localize_records(db, [dict(original, description="Changed public source")], "hi")
        assert len(calls) == 2
    with_database(check)


def test_missing_provider_preserves_original_with_explicit_status():
    async def check(db):
        result = (await loc.localize_records(db, [{"scheme_name": "Loan scheme", "benefits": "Benefit 10%"}], "ta"))[0]
        assert result["scheme_name"] == "Loan scheme"
        assert result["translation_status"] == "unavailable"
        assert result["content_language"] == "en"
    with_database(check)


@pytest.mark.parametrize("target", ["लाभ 20%", "Benefit 10%", "", None])
def test_invalid_or_untranslated_financial_details_are_rejected(target):
    assert not loc.valid_translation("Benefit 10%", target, "hi")
    assert loc.valid_translation("Benefit 10%", "लाभ 10%", "hi")


def test_benefit_translation_cannot_change_official_urls():
    assert not loc.valid_translation("See https://example.gov.in", "देखें https://bad.example", "hi")


@pytest.mark.parametrize("language,query", [("hi", "ऋण"), ("mr", "कर्ज"), ("gu", "લોન"), ("ta", "கடன்"), ("te", "రుణం"), ("bn", "ঋণ"), ("kn", "ಸಾಲ")])
def test_indic_discovery_terms_work_without_provider(language, query):
    assert asyncio.run(loc.search_query(query, language)) == ("loan", "dictionary")


def test_provider_contract_is_structured_and_uses_header_key(monkeypatch):
    monkeypatch.setattr(loc.settings, "GEMINI_API_KEY", "test-only-key")
    def handle(request):
        assert request.headers["x-goog-api-key"] == "test-only-key"
        assert "test-only-key" not in str(request.url)
        body = json.loads(request.content)
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        assert json.loads(body["contents"][0]["parts"][0]["text"]) == ["Loan"]
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": '["ऋण"]'}]}}]})
    client = httpx.AsyncClient
    monkeypatch.setattr(loc.httpx, "AsyncClient", lambda **kw: client(transport=httpx.MockTransport(handle), **kw))
    assert asyncio.run(loc.translate_batch(["Loan"], "en", "hi")) == ["ऋण"]


def test_partial_or_failed_provider_output_never_claims_complete_translation(monkeypatch):
    monkeypatch.setattr(loc.settings, "GEMINI_API_KEY", "test-only-key")
    async def incomplete(*args): return []
    monkeypatch.setattr(loc, "translate_batch", incomplete)
    async def check(db):
        row = (await loc.localize_records(db, [{"description": "A loan for 100"}], "hi"))[0]
        assert row["translation_status"] == "unavailable"
        assert row["description"] == "A loan for 100"
    with_database(check)
