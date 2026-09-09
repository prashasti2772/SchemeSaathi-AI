"""Regression tests for the citizen prototype; no paid APIs or real messages."""
import os
import tempfile
import uuid
from pathlib import Path
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + str(Path(tempfile.gettempdir()) / ("schemesathi-test-" + uuid.uuid4().hex + ".db"))
os.environ["JWT_SECRET_KEY"] = "test-only-random-secret-that-is-not-for-production"
os.environ["SMS_LIVE_ENABLED"] = "false"
os.environ["BHASHINI_API_KEY"] = ""
os.environ["BHASHINI_USER_ID"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["CHATBOT_API_KEY"] = ""
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.modules.eligibility.service import eligibility_service
from src.ml.eligibility_engine.parser import parse_gender, parse_categories, parse_income
from src.modules.chatbot.service import chatbot_service

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        app.state.limiter.enabled = False
        yield c

def new_account(client, suffix):
    response = client.post("/api/v1/citizen/register", json={
        "full_name": "Prototype Tester", "email": f"tester{suffix}@example.com",
        "mobile": f"98765432{suffix:02}", "password": "a-long-test-password"})
    assert response.status_code == 201, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}

def test_health_and_catalog(client):
    assert client.get("/health").status_code == 200
    result = client.get("/api/v1/eligibility/schemes?limit=5").json()
    assert result["total"] == 653 and len(result["schemes"]) == 5

def test_auth_is_real(client):
    auth = new_account(client, 1)
    assert client.get("/api/v1/citizen/me", headers=auth).json()["role"] == "citizen"
    assert client.post("/api/v1/citizen/login", json={"identifier":"tester1@example.com","password":"wrong"}).status_code == 401
    assert client.post("/api/v1/citizen/login", json={"identifier":"9876543201","password":"a-long-test-password"}).status_code == 200
    assert client.get("/api/v1/citizen/me").status_code == 401
    assert client.get("/api/v1/users", headers=auth).status_code == 403
    assert client.post("/api/v1/citizen/outreach-send", headers=auth).status_code == 403

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
    r = client.post("/api/v1/citizen/outreach-send",headers=staff)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "provider_accepted" and r.json()["count"] == 1
    assert sent[0]["recipients"][0]["mobiles"] == "919876543209"
    assert client.post("/api/v1/citizen/outreach-send",headers=staff).json()["count"] == 0
    assert len(sent) == 1

