"""Catalogue provenance, tri-state screening and grounded provider fallback."""
import asyncio
from types import SimpleNamespace

import pytest

from src.modules.eligibility.catalogue import load_catalogue
from src.modules.eligibility.service import eligibility_service
from src.modules.chatbot.service import chatbot_service


def test_verified_catalogue_covers_all_citizen_sectors():
    rows = load_catalogue()
    assert len(rows) == 14
    assert {row["category"] for row in rows} == {
        "Education", "Healthcare", "Agriculture", "Pensions", "Housing", "Employment",
        "Skill Development", "Women", "Disability Support", "Entrepreneurship",
        "Artisan Support", "Marketing & Technology",
    }
    assert len({row["scheme_id"] for row in rows}) == len(rows)
    assert all(row["source_urls"] and row["criteria"] and row["verified_on"] in {"2026-10-28", "2026-10-31"} for row in rows)
    view = eligibility_service.get_scheme("pmegp")
    view["name"] = "must not mutate the runtime snapshot"
    assert eligibility_service.get_scheme("pmegp")["name"] != view["name"]
    assert eligibility_service.get_scheme("not-a-reviewed-scheme") is None


def test_no_demographic_income_or_business_defaults():
    profile = eligibility_service.normalize_profile({})
    for field in ("age", "gender", "social_category", "annual_income", "rural", "disability", "business_type", "entrepreneurship_support"):
        assert profile[field] is None
    matches = eligibility_service.match_schemes({})
    assert all(row["status"] == "UNKNOWN" and not row["eligible"] for row in matches)
    assert eligibility_service.match_schemes({}, eligible_only=True) == []


def test_citizen_needs_rank_without_assuming_business():
    matches = eligibility_service.match_schemes({"age": 22, "state": "Uttar Pradesh", "occupation": "Student", "interests": "Education scholarship", "entrepreneurship_support": False})
    assert matches[0]["category"] == "Education"
    assert all(row["category"] != "Entrepreneurship" for row in matches)
    assert matches[0]["status"] == "UNKNOWN" and matches[0]["required_information"]


def test_income_zero_false_and_legacy_values_remain_explicit():
    profile = eligibility_service.normalize_profile({"annualIncome": 0, "disability": "No", "rural": "false", "entrepreneurshipSupport": "No"})
    assert profile["annual_income"] == 0
    assert profile["disability"] is False and profile["rural"] is False
    assert profile["entrepreneurship_support"] is False


def test_age_failure_missing_information_and_eligible_filters():
    young = {r["scheme_id"]: r for r in eligibility_service.match_schemes({"age": 20, "state": "Kerala"})}
    assert young["ab-pmjay-senior-citizens"]["status"] == "INELIGIBLE"
    assert young["adip"]["status"] == "UNKNOWN"
    senior = {r["scheme_id"]: r for r in eligibility_service.match_schemes({"age": 72, "state": "Kerala"}, eligible_only=True)}
    assert senior["ab-pmjay-senior-citizens"]["status"] == "ELIGIBLE"
    assert "ignoaps" not in senior  # Age alone never establishes BPL status.


@pytest.mark.parametrize("profile", [{"age": 20.5}, {"age": True}, {"age": "abc"}, {"annual_income": -1}, {"annual_income": "-200"}, {"annual_income": float("nan")}, {"state": "invalid"}])
def test_invalid_profiles_are_not_successful_matches(profile):
    with pytest.raises(ValueError):
        eligibility_service.match_schemes(profile)


def test_scheme_specific_chat_cannot_emit_provider_invented_facts(monkeypatch):
    chatbot_service._ensure_initialized()
    async def fabricated(**kwargs):
        raise AssertionError("Scheme facts must come directly from reviewed catalogue")
    monkeypatch.setattr(chatbot_service, "_genai_client", SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=fabricated))))
    answer = asyncio.run(chatbot_service.chat("What are the eligibility rules for PMEGP?"))
    assert answer["mode"] == "local_retrieval"
    assert "Class VIII" in answer["reply"]
    assert answer["retrieved_schemes"][0]["verified_on"] == "2026-10-28"


def test_provider_failure_retains_local_concept_answer(monkeypatch):
    chatbot_service._ensure_initialized()
    async def unavailable(**kwargs):
        raise TimeoutError("simulated unavailable provider")
    monkeypatch.setattr(chatbot_service, "_genai_client", SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=unavailable))))
    answer = asyncio.run(chatbot_service.chat("What is a subsidy?"))
    assert answer["mode"] == "local_guide"
    assert "financial support" in answer["reply"]


def test_legacy_model5_entry_point_uses_same_citizen_rules():
    from src.ml.model5_engine import BeneficiaryProfileBuilder, match_schemes_with_engine
    profile = BeneficiaryProfileBuilder().build_profile({"state": "up", "occupation": "Student", "annualIncome": 0})
    assert profile["business_type"] is None and profile["annual_income"] == 0
    assert profile["rural"] is None and profile["disability"] is None
    assert all(not row["eligible"] and row["status"] == "UNKNOWN" for row in match_schemes_with_engine(profile))


def test_legacy_restricted_business_does_not_match_missing_or_student_activity():
    from src.ml.eligibility_engine.matcher import EligibilityMatcher
    matcher = EligibilityMatcher()
    assert matcher.match_business(None, "MSME") is None
    assert matcher.match_business("student", "MSME") is False
    assert matcher.match_business("tailoring", "MSME") is True


@pytest.mark.parametrize("question,scheme_id", [
    ("I need training", "esdp"),
    ("What support is available for artisans?", "pm-vishwakarma"),
    ("Marketing support for an SC entrepreneur", "nssh"),
    ("Find grants for artisans", "pm-vishwakarma"),
    ("What grants are available for women?", "pmegp"),
    ("Loans for women", "pmmy"),
    ("I want to start a business", "esdp"),
    ("I need healthcare support", "ab-pmjay-senior-citizens"),
])
def test_plain_support_requests_retrieve_relevant_verified_schemes(monkeypatch, question, scheme_id):
    chatbot_service._ensure_initialized()
    monkeypatch.setattr(chatbot_service, "_genai_client", None)
    answer = asyncio.run(chatbot_service.chat(question))
    assert answer["intent"] == "discovery"
    assert scheme_id in {row["slug"] for row in answer["retrieved_schemes"]}
    assert "not confirmed eligibility" in answer["reply"]


def test_followup_remembers_schemes_from_the_assistant_result(monkeypatch):
    chatbot_service._ensure_initialized()
    monkeypatch.setattr(chatbot_service, "_genai_client", None)
    first = asyncio.run(chatbot_service.chat("What support is available for artisans?"))
    answer = asyncio.run(chatbot_service.chat("What documents are needed?", history=[
        {"role": "user", "content": "What support is available for artisans?"},
        {"role": "assistant", "content": first["reply"]},
    ]))
    assert answer["intent"] == "documents"
    assert "pm-vishwakarma" in {row["slug"] for row in answer["retrieved_schemes"]}
    assert "**Documents:**" in answer["reply"]


def test_relevance_does_not_confirm_eligibility_and_conditions_are_tri_state():
    matches = eligibility_service.match_schemes({
        "age": 30, "state": "Kerala", "interests": "artisan training marketing",
        "entrepreneurship_support": True,
    })
    artisan = next(row for row in matches if row["scheme_id"] == "pm-vishwakarma")
    assert artisan["relevance_status"] == "MATCH" and artisan["relevance_score"] > 0
    assert artisan["screening_result"] == "UNKNOWN" and not artisan["eligible"]
    assert {condition["result"] for condition in artisan["detailed_explanation"]} == {"MATCH", "UNKNOWN"}
    nssh = next(row for row in eligibility_service.match_schemes({"social_category": "GENERAL"}) if row["scheme_id"] == "nssh")
    assert nssh["screening_result"] == "NOT_MATCH"
    assert nssh["detailed_explanation"][0]["result"] == "NOT_MATCH"
    assert eligibility_service.get_scheme("nssh")["application_url"] == "https://scsthub.in/"


def test_new_scheme_facts_and_sources_are_not_rewritten_by_a_provider(monkeypatch):
    chatbot_service._ensure_initialized()
    async def fabricated(**kwargs):
        raise AssertionError("Scheme-specific answers must remain grounded")
    monkeypatch.setattr(chatbot_service, "_genai_client", SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=fabricated))))
    answer = asyncio.run(chatbot_service.chat("How do I apply for PM Vishwakarma?"))
    assert "Common Service Centre" in answer["reply"]
    assert "https://pmvishwakarma.gov.in/" in answer["reply"]
    assert "2026-10-31" in answer["reply"]
