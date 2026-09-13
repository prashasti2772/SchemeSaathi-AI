"""Support workflows: isolated accounts, mocked delivery, no real email or SMS."""
import os
import sqlite3
from unittest.mock import AsyncMock

import pytest
from test_prototype import client, new_account
from src.config.settings import settings
from src.integrations import email_client
from src.modules.public import citizen


@pytest.fixture(autouse=True)
def mock_delivery(monkeypatch):
    sender = AsyncMock(return_value=True)
    monkeypatch.setattr(email_client, "email_ready", lambda: True)
    monkeypatch.setattr(email_client, "send_email", sender)
    monkeypatch.setattr(settings, "SUPPORT_EMAIL", "helpdesk@example.com")
    monkeypatch.setattr(settings, "SMS_PROVIDER", "msg91")
    return sender


def sql(statement, params=()):
    with sqlite3.connect(os.environ["DATABASE_URL"].removeprefix("sqlite+aiosqlite:///")) as db:
        return db.execute(statement, params).fetchall()


def test_ticket_conversation_survives_reply_reopen_and_refresh(client, mock_delivery):
    owner, staff, stranger = [new_account(client, suffix) for suffix in (60, 61, 62)]
    sql("UPDATE users SET role='SUPPORT' WHERE email=?", ("tester61@example.com",))
    mock_delivery.reset_mock()
    created = client.post("/api/v1/citizen/tickets", headers=owner,
                          json={"subject": "Application help", "message": "Please help with the application checklist."})
    assert created.status_code == 201, created.text
    ticket_id = created.json()["id"]
    endpoint = "/api/v1/citizen/tickets/" + ticket_id
    assert client.patch(endpoint, headers=stranger, json={"response": "Hidden reply", "status": "resolved"}).status_code == 403
    assert client.post(endpoint + "/messages", headers=stranger, json={"message": "Hidden followup"}).status_code == 404
    assert ticket_id not in [item["id"] for item in client.get("/api/v1/citizen/tickets", headers=stranger).json()]
    for message, status in [("Please check your scheme documents.", "in_progress"), ("Your document checklist is ready.", "resolved")]:
        response = client.patch(endpoint, headers=staff, json={"response": message, "status": status})
        assert response.status_code == 200, response.text
    followup = client.post(endpoint + "/messages", headers=owner, json={"message": "I also need help uploading the file."})
    assert followup.status_code == 201 and followup.json()["status"] == "open"
    ticket = next(item for item in client.get("/api/v1/citizen/tickets", headers=owner).json() if item["id"] == ticket_id)
    assert [item["author_role"] for item in ticket["replies"]] == ["support", "support", "citizen"]
    assert ticket["created_at"].endswith("Z")
    assert all(item["status"] == "accepted" for item in ticket["notifications"])
    assert len(ticket["notifications"]) == 4
    assert "recipient" not in str(ticket) and "helpdesk@example.com" not in str(ticket)
    addresses = [call.args[0] for call in mock_delivery.await_args_list]
    assert "tester60@example.com" in addresses and "helpdesk@example.com" in addresses
    assert "tester62@example.com" not in addresses


def test_email_failure_does_not_lose_a_saved_ticket(client, mock_delivery):
    owner = new_account(client, 63)
    mock_delivery.return_value = False
    created = client.post("/api/v1/citizen/tickets", headers=owner,
                          json={"subject": "Unavailable email", "message": "Please help with the application checklist."})
    assert created.status_code == 201
    saved = client.get("/api/v1/citizen/tickets", headers=owner).json()
    assert len(saved) == 1 and saved[0]["id"] == created.json()["id"]
    assert saved[0]["notifications"][0]["status"] == "failed"


def test_whitespace_ticket_is_rejected(client):
    owner = new_account(client, 64)
    response = client.post("/api/v1/citizen/tickets", headers=owner, json={"subject": "   ", "message": " " * 30})
    assert response.status_code == 422


def provider(monkeypatch, succeeds=True):
    sent = []
    class Reply:
        def raise_for_status(self):
            pass
        def json(self):
            return {"type": "success" if succeeds else "error"}
    class Provider:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def post(self, url, **kwargs):
            sent.append((url, kwargs["json"]))
            return Reply()
    monkeypatch.setattr(citizen.httpx, "AsyncClient", Provider)
    monkeypatch.setattr(settings, "SMS_PROVIDER", "msg91")
    monkeypatch.setattr(settings, "PUBLIC_SITE_URL", "https://schemesaathi.test")
    for key, value in {"SMS_LIVE_ENABLED": True, "MSG91_AUTH_KEY": "fake-key", "MSG91_TEMPLATE_ID": "fake-flow", "MSG91_SENDER_ID": "TESTER"}.items():
        monkeypatch.setattr(settings, key, value)
    return sent


def test_website_sms_is_gated_and_only_uses_account_phone(client, monkeypatch):
    owner = new_account(client, 65)
    endpoint = "/api/v1/citizen/website-sms"
    assert client.post(endpoint, headers=owner).status_code == 503
    sent = provider(monkeypatch)
    response = client.post(endpoint, headers=owner, json={"mobile": "9999999999"})
    assert response.status_code == 200 and response.json()["status"] == "provider_accepted"
    assert sent[0][1]["recipients"] == [{"mobiles": "919876543265", "website": "https://schemesaathi.test"}]
    assert client.post(endpoint, headers=owner).status_code == 429
    assert len(sent) == 1
    assert client.post(endpoint).status_code == 401


def test_provider_rejection_is_not_reported_as_sent(client, monkeypatch):
    owner = new_account(client, 66)
    sent = provider(monkeypatch, succeeds=False)
    endpoint = "/api/v1/citizen/website-sms"
    assert client.post(endpoint, headers=owner).status_code == 502
    assert client.post(endpoint, headers=owner).status_code == 429
    assert len(sent) == 1
    assert sql("SELECT status FROM website_sms_requests WHERE REPLACE(user_id,'-','')=(SELECT id FROM users WHERE email=?)", ("tester66@example.com",)) == [("failed",)]
