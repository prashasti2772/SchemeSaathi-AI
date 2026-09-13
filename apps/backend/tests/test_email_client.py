"""Email transport tests: no real email is sent."""
import asyncio
import smtplib

import httpx
import pytest


@pytest.fixture
def mail(monkeypatch):
    from src.integrations import email_client
    for name, value in {
        "EMAIL_PROVIDER": "smtp", "EMAIL_FROM_ADDRESS": "sender@example.com",
        "SMTP_HOST": "smtp.example.com", "SMTP_PORT": 587,
        "SMTP_USERNAME": "sender@example.com", "SMTP_PASSWORD": "test-app-password",
        "SMTP_USE_SSL": False, "RESEND_API_KEY": "test-only-key",
    }.items():
        monkeypatch.setattr(email_client.settings, name, value)
    return email_client


def test_missing_mail_configuration_makes_no_network_request(mail, monkeypatch):
    monkeypatch.setattr(mail.settings, "SMTP_PASSWORD", "")
    monkeypatch.setattr(mail.smtplib, "SMTP", lambda *a, **kw: pytest.fail("unexpected network request"))
    assert not mail.email_ready()
    assert not asyncio.run(mail.send_email("tester@example.com", "Verification", "test message"))


def test_gmail_app_password_configuration_is_supported(mail, monkeypatch):
    monkeypatch.setattr(mail.settings, "EMAIL_PROVIDER", "smtp")
    monkeypatch.setattr(mail.settings, "EMAIL_FROM_ADDRESS", "customercareprashasti@gmail.com")
    monkeypatch.setattr(mail.settings, "SMTP_USERNAME", "customercareprashasti@gmail.com")
    monkeypatch.setattr(mail.settings, "SMTP_PASSWORD", "app-password")
    monkeypatch.setattr(mail.smtplib, "SMTP", lambda *a, **kw: pytest.fail("unexpected network request"))
    assert mail.email_ready()


@pytest.mark.parametrize("use_ssl", [False, True])
def test_smtp_uses_tls_before_login_and_sends_plain_text(mail, monkeypatch, use_ssl):
    calls = []
    class SMTP:
        def __init__(self, host, port, **kwargs):
            assert host == "smtp.example.com"
            assert kwargs["timeout"] == 10
            if use_ssl:
                assert "context" in kwargs
            calls.append("connect")
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def ehlo(self): calls.append("ehlo")
        def starttls(self, *, context): calls.append("tls")
        def login(self, username, password): calls.append("login")
        def send_message(self, message):
            calls.append("send")
            assert message["To"] == "tester@example.com"
            assert message["From"] == "sender@example.com"
            assert message.get_content().strip() == "Your code is 123456."
            return {}
    monkeypatch.setattr(mail.settings, "SMTP_USE_SSL", use_ssl)
    monkeypatch.setattr(mail.smtplib, "SMTP_SSL" if use_ssl else "SMTP", SMTP)
    assert asyncio.run(mail.send_email("tester@example.com", "Verification", "Your code is 123456."))
    assert calls == (["connect", "login", "send"] if use_ssl else ["connect", "ehlo", "tls", "ehlo", "login", "send"])


def test_smtp_provider_failure_is_reported_as_failure(mail, monkeypatch):
    def fail(*args, **kwargs):
        raise smtplib.SMTPAuthenticationError(535, b"test rejection")
    monkeypatch.setattr(mail.smtplib, "SMTP", fail)
    assert not asyncio.run(mail.send_email("tester@example.com", "Verification", "test message"))


def test_resend_payload_and_delivery_acknowledgement(mail, monkeypatch):
    import json
    monkeypatch.setattr(mail.settings, "EMAIL_PROVIDER", "resend")
    def handler(request):
        assert str(request.url) == "https://api.resend.com/emails"
        assert request.headers["Authorization"] == "Bearer test-only-key"
        assert json.loads(request.content) == {"from": "sender@example.com", "to": ["tester@example.com"], "subject": "Verification", "text": "test message"}
        return httpx.Response(200, json={"id": "test-message-id"})
    client_class = httpx.AsyncClient
    monkeypatch.setattr(mail.httpx, "AsyncClient", lambda **kw: client_class(transport=httpx.MockTransport(handler), **kw))
    assert asyncio.run(mail.send_email("tester@example.com", "Verification", "test message"))
