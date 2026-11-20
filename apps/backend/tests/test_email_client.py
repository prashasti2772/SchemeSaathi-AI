"""Brevo email transport tests: no real email is sent."""
import asyncio

import httpx
import pytest


@pytest.fixture
def mail(monkeypatch):
    from src.integrations import email_client
    for name, value in {
        "EMAIL_PROVIDER": "brevo",
        "EMAIL_FROM_ADDRESS": "sender@example.com",
        "EMAIL_FROM_NAME": "SchemeSaathi Support",
        "BREVO_API_KEY": "test-only-key",
    }.items():
        monkeypatch.setattr(email_client.settings, name, value)
    return email_client


def test_missing_mail_configuration_makes_no_network_request(mail, monkeypatch):
    monkeypatch.setattr(mail.settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: pytest.fail("unexpected network request"))
    assert not mail.email_ready()
    assert not asyncio.run(mail.send_email("tester@example.com", "Verification", "test message"))


def test_brevo_configuration_is_supported(mail):
    assert mail.email_ready()


def test_brevo_posts_expected_payload_and_acknowledgement(mail, monkeypatch):
    import json

    def handler(request):
        assert str(request.url) == "https://api.brevo.com/v3/smtp/email"
        assert request.headers["api-key"] == "test-only-key"
        assert json.loads(request.content) == {
            "sender": {"name": "SchemeSaathi Support", "email": "sender@example.com"},
            "to": [{"email": "tester@example.com"}],
            "subject": "Verification",
            "textContent": "test message",
        }
        return httpx.Response(200, json={"messageId": "test-message-id"})

    client_class = httpx.AsyncClient
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: client_class(transport=httpx.MockTransport(handler), **kw))
    assert asyncio.run(mail.send_email("tester@example.com", "Verification", "test message"))


@pytest.mark.parametrize("status,payload,reason", [
    (401, {"message": "invalid api key"}, "api_key_rejected"),
    (403, {"message": "forbidden"}, "api_key_rejected"),
    (429, {"message": "quota reached"}, "rate_limited"),
    (500, {"message": "server error"}, "provider_unavailable"),
    (422, {"message": "bad request"}, "request_rejected"),
])
def test_brevo_failures_are_actionable_without_disclosing_provider_data(mail, monkeypatch, status, payload, reason):
    from structlog.testing import capture_logs
    client_class = httpx.AsyncClient
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: client_class(
        transport=httpx.MockTransport(lambda request: httpx.Response(status, json=payload)), **kw))
    with capture_logs() as logs:
        assert not asyncio.run(mail.send_email("private@example.com", "Reset", "Your OTP is 123456"))
    assert logs == [{"event": "email_delivery_failed", "provider": "brevo", "reason": reason, "status": status, "log_level": "warning"}]


@pytest.mark.parametrize("payload", [{}, [], {"messageId": None}, {"messageId": 123}, {"messageId": ""}])
def test_brevo_missing_acknowledgement_is_not_success(mail, monkeypatch, payload):
    from structlog.testing import capture_logs
    client_class = httpx.AsyncClient
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: client_class(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)), **kw))
    with capture_logs() as logs:
        assert not asyncio.run(mail.send_email("private@example.com", "Reset", "123456"))
    assert logs[0]["reason"] == "invalid_provider_response"


def test_email_network_timeout_logs_no_credentials(mail, monkeypatch):
    from structlog.testing import capture_logs

    def timeout(request):
        raise httpx.ReadTimeout("private@example.com 123456 test-only-key", request=request)

    client_class = httpx.AsyncClient
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: client_class(
        transport=httpx.MockTransport(timeout), **kw))
    with capture_logs() as logs:
        assert not asyncio.run(mail.send_email("private@example.com", "Reset", "123456"))
    assert logs == [{"event": "email_delivery_failed", "provider": "brevo", "reason": "provider_timeout", "log_level": "warning"}]


def test_brevo_startup_identifies_missing_sender_or_key_without_network(mail, monkeypatch):
    from structlog.testing import capture_logs
    monkeypatch.setattr(mail.settings, "EMAIL_FROM_ADDRESS", "")
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: pytest.fail("startup must not send email"))
    with capture_logs() as logs:
        mail.log_configuration()
    assert logs == [{"event": "email_not_configured", "provider": "brevo", "reason": "missing_brevo_settings", "log_level": "warning"}]


def test_transport_info_logs_with_api_keys_are_disabled():
    import logging
    from src.config.logging import configure_logging
    configure_logging("production")
    for name in ("httpx", "httpcore"):
        assert not logging.getLogger(name).isEnabledFor(logging.INFO)
