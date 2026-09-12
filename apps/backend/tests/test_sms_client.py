"""MSG91 OTP transport contract tests; all network calls are mocked."""
import asyncio
import json

import httpx
import pytest


@pytest.fixture
def sms(monkeypatch):
    from src.integrations import sms_client
    monkeypatch.setattr(sms_client.settings, "MSG91_AUTH_KEY", "test-only-key")
    monkeypatch.setattr(sms_client.settings, "MSG91_OTP_TEMPLATE_ID", "test-otp-flow")
    monkeypatch.setattr(sms_client.settings, "MSG91_SENDER_ID", "TESTER")
    return sms_client


@pytest.mark.parametrize("status,payload,expected", [(200, {"type": "success"}, True), (200, {"type": "error"}, False), (401, {"message": "rejected"}, False)])
def test_msg91_otp_uses_registered_phone_country_code_and_named_template_variable(sms, monkeypatch, status, payload, expected):
    def handler(request):
        assert str(request.url) == "https://api.msg91.com/api/v5/flow/"
        assert request.headers["authkey"] == "test-only-key"
        assert json.loads(request.content) == {"flow_id": "test-otp-flow", "sender": "TESTER", "recipients": [{"mobiles": "919876543210", "otp": "012345"}]}
        return httpx.Response(status, json=payload)
    client = httpx.AsyncClient
    monkeypatch.setattr(sms.httpx, "AsyncClient", lambda **kw: client(transport=httpx.MockTransport(handler), **kw))
    assert asyncio.run(sms.send_reset_otp("9876543210", "012345")) is expected


@pytest.mark.parametrize("missing", ["MSG91_AUTH_KEY", "MSG91_OTP_TEMPLATE_ID", "MSG91_SENDER_ID"])
def test_unconfigured_sms_never_makes_a_request(sms, monkeypatch, missing):
    monkeypatch.setattr(sms.settings, missing, "")
    monkeypatch.setattr(sms.httpx, "AsyncClient", lambda **kw: pytest.fail("unexpected network call"))
    assert not sms.otp_sms_ready()
    assert not asyncio.run(sms.send_reset_otp("9876543210", "012345"))


def test_malformed_contact_or_code_never_reaches_provider(sms, monkeypatch):
    monkeypatch.setattr(sms.httpx, "AsyncClient", lambda **kw: pytest.fail("unexpected network call"))
    assert not asyncio.run(sms.send_reset_otp("attacker@example.com", "012345"))
    assert not asyncio.run(sms.send_reset_otp("9876543210", "invalid"))
