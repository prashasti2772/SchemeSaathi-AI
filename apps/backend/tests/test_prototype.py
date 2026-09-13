"""Regression tests for the citizen prototype; no paid APIs or real messages."""
import os
import tempfile
import uuid
from pathlib import Path
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from src.main import app
from src.modules.eligibility.service import eligibility_service
from src.ml.eligibility_engine.parser import parse_gender, parse_categories, parse_income
from src.modules.chatbot.service import chatbot_service

@pytest.fixture(scope="module")
def client():
    from src.integrations import email_client, sms_client
    from src.modules.auth import login_otp
    async def fake_delivery(*args, **kwargs):
        return True
    with patch.object(email_client, "email_ready", return_value=True), patch.object(email_client, "send_email", fake_delivery), patch.object(sms_client, "otp_sms_ready", return_value=True), patch.object(sms_client, "send_reset_otp", fake_delivery), patch.object(login_otp, "otp_text", return_value="123456"), TestClient(app) as c:
        app.state.limiter.enabled = False
        yield c

def captcha_fields(client):
    from src.modules.auth import recovery
    with patch.object(recovery, "captcha_text", return_value="ABC234"):
        response = client.get("/api/v1/citizen/captcha")
    assert response.status_code == 200, response.text
    return {"captcha_id": response.json()["captcha_id"], "captcha_answer": "ABC234"}


def new_account(client, suffix):
    response = client.post("/api/v1/citizen/register", json={
        "full_name": "Prototype Tester", "email": f"tester{suffix}@example.com",
        "mobile": f"98765432{suffix:02}", "password": "a-long-test-password", **captcha_fields(client)})
    assert response.status_code == 201, response.text
    login = client.post("/api/v1/citizen/login", json={"identifier": f"tester{suffix}@example.com", "password": "a-long-test-password"})
    assert login.status_code == 200, login.text
    verified = client.post("/api/v1/citizen/verify-login-otp", json={"challenge_id": login.json()["challenge_id"], "otp": "123456"})
    assert verified.status_code == 200, verified.text
    return {"Authorization": "Bearer " + verified.json()["access_token"]}

def test_health_and_catalog(client):
    assert client.get("/health").status_code == 200
    result = client.get("/api/v1/eligibility/schemes?limit=5").json()
    assert result["total"] == 653 and len(result["schemes"]) == 5

def test_auth_is_real(client):
    auth = new_account(client, 1)
    assert client.get("/api/v1/citizen/me", headers=auth).json()["role"] == "citizen"
    assert client.post("/api/v1/citizen/login", json={"identifier":"tester1@example.com","password":"wrong"}).status_code == 401
    assert client.post("/api/v1/citizen/login", json={"identifier":"9876543201","password":"a-long-test-password"}).status_code == 429
    assert client.get("/api/v1/citizen/me").status_code == 401
    assert client.get("/api/v1/users", headers=auth).status_code == 403
    assert client.post("/api/v1/citizen/outreach-send", headers=auth).status_code == 403

def test_password_reset_flow(client, monkeypatch):
    from src.modules.auth import recovery
    sent = []
    monkeypatch.setattr(recovery.email_client, "email_ready", lambda: True)
    monkeypatch.setattr(recovery, "otp_text", lambda: "123456")
    async def send_email(address, subject, body):
        sent.append((address, body))
        return True
    monkeypatch.setattr(recovery.email_client, "send_email", send_email)
    email = "resetter@example.com"
    password = "a-long-test-password"
    register = client.post("/api/v1/citizen/register", json={
        "full_name": "Reset Tester", "email": email, "mobile": "9876543210",
        "password": password, **captcha_fields(client),
    })
    assert register.status_code == 201, register.text
    login = client.post("/api/v1/citizen/login", json={"identifier": email, "password": password})
    verified_login = client.post("/api/v1/citizen/verify-login-otp", json={"challenge_id": login.json()["challenge_id"], "otp": "123456"})
    old_auth = {"Authorization": "Bearer " + verified_login.json()["access_token"]}
    sent.clear()
    forgot = client.post("/api/v1/citizen/forgot-password", json={"identifier": email, **captcha_fields(client)})
    assert forgot.status_code == 200, forgot.text
    assert "token" not in forgot.json() and "otp" not in forgot.json()
    assert sent[0][0] == email and "123456" in sent[0][1]
    verified = client.post("/api/v1/citizen/verify-reset-otp", json={"challenge_id": forgot.json()["challenge_id"], "otp": "123456"})
    assert verified.status_code == 200, verified.text
    token = verified.json()["token"]
    changed = client.post("/api/v1/citizen/reset-password", json={"token": token, "password": " new-longer-password "})
    assert changed.status_code == 200, changed.text
    assert client.post("/api/v1/citizen/login", json={"identifier": email, "password": password}).status_code == 401
    assert client.post("/api/v1/citizen/login", json={"identifier": email, "password": " new-longer-password "}).status_code == 429
    assert client.post("/api/v1/citizen/login", json={"identifier": email, "password": "new-longer-password"}).status_code == 401
    assert client.get("/api/v1/citizen/me", headers=old_auth).status_code == 401
    assert client.post("/api/v1/citizen/reset-password", json={"token": token, "password": "another-password"}).status_code == 410


def test_ticket_isolation_and_consent(client):
    first = new_account(client, 2); second = new_account(client, 3)
    r = client.post("/api/v1/citizen/tickets", headers=first, json={"subject":"Scheme help","message":"Please help with application documents"})
    assert r.status_code == 201
    assert len(client.get("/api/v1/citizen/tickets", headers=first).json()) == 1
    assert client.get("/api/v1/citizen/tickets", headers=second).json() == []
    assert client.patch("/api/v1/citizen/tickets/"+r.json()["id"], headers=second, json={"response":"Unauthorized response","status":"resolved"}).status_code == 403
    assert client.put("/api/v1/citizen/sms-consent", headers=first, json={"consent":True}).json()["consent"]
    assert not client.put("/api/v1/citizen/sms-consent", headers=first, json={"consent":False}).json()["consent"]

def test_rule_regressions():
    assert parse_gender("Female") == ["female"]
    assert parse_categories("SC, ST") == ["sc","st"]
    assert parse_income("2.5 lakh")[1] == 250000
    profile = eligibility_service.normalize_profile({"age":28,"gender":"Female","social_category":"ST","disability":"No","rural":"false"})
    assert profile["Category"] == "ST"
    assert profile["Disability"] is False and profile["Rural"] is False

def test_matches_and_invalid_location(client):
    profile={"age":28,"gender":"Female","social_category":"SC","state":"Uttar Pradesh","district":"Lucknow","annual_income":180000,"business_type":"Tailoring","rural":True}
    r=client.post("/api/v1/public/self-service/schemes-match", json=profile)
    assert r.status_code == 200, r.text
    matches=r.json()["matches"]
    assert matches, r.text
    assert all("Agriculture Infrastructure Fund" != m["name"] for m in matches)
    assert all(m["eligible"] and not m["failed_conditions"] and 0 <= m["score"] <= 1 for m in matches)
    assert all("State" in m["matched_conditions"] for m in matches)
    for m in matches:
        row=eligibility_service.engine.df.loc[eligibility_service.engine.df["Scheme Name"] == m["name"]].iloc[0]
        assert row["State"] in ("Any","Uttar Pradesh")
    profile["district"]="Chennai"
    assert client.post("/api/v1/public/self-service/schemes-match",json=profile).status_code == 422
    assert client.post("/api/v1/public/self-service/schemes-match",json={}).status_code == 422

def test_chat_without_keys(client):
    r=client.post("/api/v1/public/self-service/assistant-chat",json={"message":"tailoring loan"})
    assert r.status_code == 200, r.text
    assert r.json()["retrieved_schemes"] and len(r.json()["reply"]) > 100
    assert r.json()["mode"] == "local_retrieval"
    assert client.post("/api/v1/public/self-service/assistant-chat",json={"message":""}).status_code == 422
    assert chatbot_service.search("zzzzzzzzxxxxxxxxxx") == []


def test_chat_upload_route_uses_ocr_text(client, monkeypatch):
    async def fake_ocr(file, filename):
        return "PMEGP requires Aadhaar, income certificate and a project report."
    monkeypatch.setattr("src.modules.public.router.extract_attachment_text", fake_ocr)
    response = client.post(
        "/api/v1/public/self-service/assistant-chat/upload",
        data={"message": "What documents do I need?", "language": "en"},
        files={"file": ("document.jpg", b"fake-image", "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "document" in body["reply"].lower() or "pmegp" in body["reply"].lower()


def test_voice_honest_when_unconfigured(client):
    assert client.get("/api/v1/public/voice/status").json()["configured"] is False
    assert client.post("/api/v1/public/voice/chat",json={"text":"hello"}).status_code == 503

def test_location_snapshot():
    locations = eligibility_service.locations
    assert len(locations) == 36
    assert len(locations["Uttar Pradesh"]) == 75
    assert "Lucknow" in locations["Uttar Pradesh"]
    assert "Chennai" not in locations["Uttar Pradesh"]
    assert all(len(items) == len(set(items)) and items for items in locations.values())


def test_outreach_batches_are_reserved_and_not_sent_twice(client, monkeypatch):
    import sqlite3
    from src.config.settings import settings
    from src.modules.public import citizen
    staff = new_account(client, 8)
    recipient = new_account(client, 9)
    with sqlite3.connect(os.environ["DATABASE_URL"].removeprefix("sqlite+aiosqlite:///")) as db:
        db.execute("UPDATE users SET role='ADMIN' WHERE email=?", ("tester8@example.com",))
    assert client.put("/api/v1/citizen/sms-consent", headers=recipient, json={"consent":True}).status_code == 200
    assert client.post("/api/v1/citizen/outreach-send",headers=staff).status_code == 503
    sent = []
    class Reply:
        def raise_for_status(self): pass
        def json(self): return {"type":"success"}
    class Provider:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            sent.append(kwargs["json"])
            return Reply()
    monkeypatch.setattr(citizen.httpx, "AsyncClient", Provider)
    monkeypatch.setattr(settings, "SMS_LIVE_ENABLED", True)
    monkeypatch.setattr(settings, "MSG91_AUTH_KEY", "test-only")
    monkeypatch.setattr(settings, "MSG91_TEMPLATE_ID", "test-only")
    monkeypatch.setattr(settings, "MSG91_SENDER_ID", "TESTER")
    monkeypatch.setattr(settings, "PUBLIC_SITE_URL", "https://schemesaathi.test")
    r = client.post("/api/v1/citizen/outreach-send",headers=staff)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "provider_accepted" and r.json()["count"] == 1
    assert sent[0]["recipients"][0]["mobiles"] == "919876543209"
    assert client.post("/api/v1/citizen/outreach-send",headers=staff).json()["count"] == 0
    assert len(sent) == 1



def test_search_pagination_and_multiple_words(client):
    first = client.get("/api/v1/eligibility/schemes?limit=12").json()
    second = client.get("/api/v1/eligibility/schemes?limit=12&offset=12").json()
    assert first["has_more"] and len(second["schemes"]) == 12
    assert not set(s["scheme_name"] for s in first["schemes"]) & set(s["scheme_name"] for s in second["schemes"])
    found = client.get("/api/v1/eligibility/schemes", params={"query":"women loan"}).json()
    assert found["total"] > 0
    assert client.get("/api/v1/eligibility/schemes?query=zzzzqqqqxxxx").json()["total"] == 0
    assert client.get("/api/v1/eligibility/schemes?offset=-1").status_code == 422


def test_scheme_specific_chat_and_followup(client):
    result = chatbot_service.search("Tell me about PMEGP")
    assert "employment generation" in result[0]["scheme_name"].lower()
    followup = client.post("/api/v1/public/self-service/assistant-chat", json={
        "message":"What documents are needed?", "history":[{"role":"user","content":"Tell me about PMEGP"}]}).json()
    assert "employment generation" in followup["retrieved_schemes"][0]["scheme_name"].lower()


def test_sms_preference_persists(client):
    auth = new_account(client, 15)
    assert client.get("/api/v1/citizen/sms-consent", headers=auth).json()["consent"] is False
    client.put("/api/v1/citizen/sms-consent", headers=auth, json={"consent":True})
    assert client.get("/api/v1/citizen/sms-consent", headers=auth).json()["consent"] is True


def test_voice_retains_answer_when_audio_fails(client, monkeypatch):
    from fastapi import HTTPException
    from src.integrations import bhashini_client
    monkeypatch.setattr(bhashini_client, "configured", lambda: True)
    async def translate(text, source, target): return "tailoring loan" if target == "en" else "Translated answer"
    async def tts(*args): raise HTTPException(503, "provider unavailable")
    monkeypatch.setattr(bhashini_client, "translate_text", translate)
    monkeypatch.setattr(bhashini_client, "text_to_speech", tts)
    result = client.post("/api/v1/public/voice/chat", json={"text":"question","language":"hi"})
    assert result.status_code == 200
    assert result.json()["reply"] == "Translated answer" and result.json()["warning"]
    assert result.json()["audio_base64"] is None
    assert client.post("/api/v1/public/voice/chat", json={"audio_base64":"bad", "language":"hi"}).status_code == 422


def test_bhashini_selects_requested_language(monkeypatch):
    import asyncio
    from src.integrations import bhashini_client as b
    from src.config.settings import settings
    calls = []
    class Response:
        def __init__(self, data): self.data = data
        def raise_for_status(self): pass
        def json(self): return self.data
    class Provider:
        def __init__(self, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, **kw):
            calls.append(kw)
            if len(calls) == 1:
                return Response({"pipelineResponseConfig":[{"taskType":"tts","config":[
                    {"serviceId":"wrong","language":{"sourceLanguage":"en"}},
                    {"serviceId":"hindi","language":{"sourceLanguage":"hi"},"supportedVoices":["male"]}]}],
                    "pipelineInferenceAPIEndPoint":{"callbackUrl":"https://dhruva-api.bhashini.gov.in/services/inference/pipeline", "inferenceApiKey":{"name":"Authorization","value":"test"}}})
            return Response({"pipelineResponse":[{"taskType":"tts","audio":[{"audioContent":"test-audio"}]}]})
    monkeypatch.setattr(b, "configured", lambda: True)
    monkeypatch.setattr(b.httpx, "AsyncClient", Provider)
    assert asyncio.run(b.text_to_speech("test", "hi")) == "test-audio"
    config = calls[1]["json"]["pipelineTasks"][0]["config"]
    assert config["serviceId"] == "hindi" and config["gender"] == "male"
    assert config["audioFormat"] == "wav"


def test_detailed_multilingual_chat_uses_translation_when_available(client, monkeypatch):
    from src.integrations import bhashini_client as b
    calls = []
    monkeypatch.setattr(b, "configured", lambda: True)
    async def translate(text, source, target):
        calls.append((source, target))
        return "Translated scheme answer"
    monkeypatch.setattr(b, "translate_text", translate)
    result = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What documents are needed for PMEGP?", "language":"hi"})
    assert result.status_code == 200 and result.json()["reply"] == "Translated scheme answer"
    assert calls == [("en", "hi")]
    assert result.json()["retrieved_schemes"]
    monkeypatch.setattr(b, "configured", lambda: False)
    result = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What documents are needed for PMEGP?", "language":"hi"})
    assert result.status_code == 200
    assert result.json()["language"] == "hi"
    assert "Translation is unavailable until Bhashini" not in result.json()["reply"]


def test_income_decimal_and_open_ended_band():
    from src.modules.eligibility.service import _parse_income
    assert _parse_income("1.3 lakh") == 130000
    assert _parse_income("Below 2.5 lakh") == 250000
    assert _parse_income("1 - 3 lakh") == 300000
    assert _parse_income("Above 25 lakh") == float("inf")


@pytest.mark.parametrize("language,question,word", [
    ("en", "tell me what is subsidy", "financial support"),
    ("hi", "सब्सिडी क्या है?", "आर्थिक सहायता"),
    ("mr", "सब्सिडी म्हणजे काय?", "आर्थिक सहाय्य"),
    ("gu", "સબસિડી શું છે?", "આર્થિક મદદ"),
    ("ta", "மானியம் என்றால் என்ன?", "நிதி உதவி"),
    ("te", "సబ్సిడీ అంటే ఏమిటి?", "ఆర్థిక సహాయం"),
    ("bn", "ভর্তুকি কী?", "আর্থিক সহায়তা"),
    ("kn", "ಸಬ್ಸಿಡಿ ಎಂದರೇನು?", "ಹಣಕಾಸಿನ ನೆರವು"),
])
def test_subsidy_is_explained_in_each_ui_language_without_keys(client, language, question, word):
    r = client.post("/api/v1/public/self-service/assistant-chat", json={"message":question, "language":language})
    assert r.status_code == 200
    data = r.json()
    assert data["language"] == language and data["intent"] == "explanation"
    assert word in data["reply"]
    assert data["retrieved_schemes"] == []
    assert "top matching" not in data["reply"]


@pytest.mark.parametrize("question,expected_intent", [
    ("Give me an example", "example"),
    ("Do I have to pay it back?", "repayment"),
    ("What is the difference between a loan and a subsidy?", "explanation"),
    ("How do I apply?", "which_scheme"),
    ("aru", "clarify"),
])
def test_followups_and_unclear_input_are_not_scheme_search(client, question, expected_intent):
    r = client.post("/api/v1/public/self-service/assistant-chat", json={"message":question, "history":[{"role":"user","content":"What is a subsidy?"}]})
    assert r.status_code == 200
    assert r.json()["intent"] == expected_intent
    assert r.json()["retrieved_schemes"] == []
    if expected_intent == "example":
        assert "hypothetical" in r.json()["reply"]
    if expected_intent == "repayment":
        assert "linked loan still needs repayment" in r.json()["reply"]


def test_definition_changes_subject_after_a_scheme_question(client):
    r = client.post("/api/v1/public/self-service/assistant-chat", json={
        "message":"What is collateral?", "profile":{"businessActivity":"tailoring", "state":"Kerala"},
        "history":[{"role":"user","content":"Tell me about PMEGP"}]})
    assert r.json()["intent"] == "explanation"
    assert "asset pledged" in r.json()["reply"] and r.json()["retrieved_schemes"] == []


def test_language_detection_and_switch_keep_the_topic(client):
    for q in ["subsidy kya hoti hai", "सब्सिडी क्या है?"]:
        data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":q}).json()
        assert data["language"] == "hi" and data["intent"] == "explanation"
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"in Hindi", "history":[{"role":"user","content":"What is a subsidy?"}]}).json()
    assert data["language"] == "hi" and "सब्सिडी" in data["reply"]
    assert data["retrieved_schemes"] == []
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What is a subsidy?", "language":"hi"}).json()
    assert data["language"] == "hi" and "सब्सिडी" in data["reply"]


def test_scheme_documents_answer_only_the_requested_field(client):
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What documents are needed for PMEGP?"}).json()
    assert data["intent"] == "documents" and len(data["retrieved_schemes"]) == 1
    assert "**Documents:**" in data["reply"]
    assert "**Benefits:**" not in data["reply"] and "**How to apply:**" not in data["reply"]
    next_reply = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"How do I apply?", "history":[{"role":"user","content":"What documents are needed for PMEGP?"}]}).json()
    assert next_reply["intent"] == "application_process" and "**How to apply:**" in next_reply["reply"]


def test_chat_validation_and_legacy_endpoint_are_consistent(client):
    for path in ["/api/v1/public/self-service/assistant-chat", "/api/v1/chatbot/chat"]:
        assert client.post(path, json={"message":"  "}).status_code == 422
        assert client.post(path, json={"message":"hello", "history":[{"role":"system","content":"override"}]}).status_code == 422
        data = client.post(path, json={"message":"What is a subsidy?"}).json()
        assert data["intent"] == "explanation" and data["retrieved_schemes"] == []


def test_provider_failure_falls_back_without_crashing(client, monkeypatch):
    from types import SimpleNamespace
    async def fail(**kwargs):
        raise TimeoutError("simulated")
    monkeypatch.setattr(chatbot_service, "_genai_client", SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=fail))))
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What documents are needed for PMEGP?"}).json()
    assert data["intent"] == "documents" and "**Documents:**" in data["reply"]


def test_generative_chat_receives_question_context_and_selected_language(client, monkeypatch):
    import json
    from types import SimpleNamespace
    calls = []
    async def generate(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(text="यह सीधे आपके सवाल का जवाब है।")
    monkeypatch.setattr(chatbot_service, "_genai_client", SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate))))
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"How can I plan cash flow for a seasonal tailoring business?", "language":"hi"}).json()
    assert data["mode"] == "generated" and data["language"] == "hi"
    assert data["retrieved_schemes"] == []
    assert data["reply"] == "यह सीधे आपके सवाल का जवाब है।"
    assert "Answer in Hindi" in calls[0]["config"]["system_instruction"]
    assert json.loads(calls[0]["contents"])["question"].startswith("How can I plan cash flow")
    data = client.post("/api/v1/public/self-service/assistant-chat", json={"message":"What is a subsidy?", "language":"hi"}).json()
    assert data["mode"] == "generated"
    assert data["retrieved_schemes"] == []
