"""Firebase flows use mocked HTTPS responses, never real phone numbers/SMS."""
import json
import httpx
import pytest
from test_auth_recovery import recovery_app, PREFIX, EMAIL, MOBILE, PASSWORD


@pytest.fixture
def firebase(monkeypatch):
    from src.integrations import firebase_phone
    for key, value in {"SMS_PROVIDER": "firebase", "FIREBASE_API_KEY": "test-key", "FIREBASE_PROJECT_ID": "test-project"}.items():
        monkeypatch.setattr(firebase_phone.settings, key, value)
    sent = []
    def handle(request):
        payload = json.loads(request.content)
        assert request.url.host == "identitytoolkit.googleapis.com"
        if request.url.path.endswith("sendVerificationCode"):
            assert payload["recaptchaToken"] == "test-recaptcha"
            sent.append(payload["phoneNumber"])
            return httpx.Response(200, json={"sessionInfo": "secret-provider-session"})
        assert payload["sessionInfo"] == "secret-provider-session"
        if payload["code"] != "123456":
            return httpx.Response(400, json={"error": {"message": "INVALID_CODE"}})
        return httpx.Response(200, json={"idToken": "verified-provider-response", "phoneNumber": "+91" + MOBILE})
    client = httpx.AsyncClient
    monkeypatch.setattr(firebase_phone.httpx, "AsyncClient", lambda **kw: client(transport=httpx.MockTransport(handle), **kw))
    return sent


def test_firebase_login_requires_provider_verified_code(recovery_app, firebase):
    app = recovery_app
    app.register()
    payload = {"identifier": EMAIL, "password": PASSWORD, "channel": "mobile"}
    assert app.client.post(PREFIX + "/login", json=payload).status_code == 400
    issued = app.client.post(PREFIX + "/login", json={**payload, "recaptcha_token": "test-recaptcha"})
    assert issued.status_code == 200, issued.text
    challenge = issued.json()["challenge_id"]
    assert firebase == ["+91" + MOBILE]
    row = app.sql("SELECT encrypted_session FROM firebase_phone_sessions WHERE id=?", (challenge,))[0]
    assert "secret-provider-session" not in row[0]
    bad = app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": challenge, "otp": "000000", "firebase_verified": True})
    assert bad.status_code == 400
    good = app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": challenge, "otp": "123456"})
    assert good.status_code == 200 and good.json()["access_token"]
    assert app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": challenge, "otp": "123456"}).status_code == 410


def test_firebase_recovery_sends_only_to_registered_phone_and_requires_verification(recovery_app, firebase):
    app = recovery_app
    app.register()
    def request(number):
        return app.client.post(PREFIX + "/forgot-password", json={"identifier": number, "channel": "mobile", "recaptcha_token": "test-recaptcha", **app.captcha()})
    known, unknown = request(MOBILE), request("9876543211")
    assert known.status_code == unknown.status_code == 200
    assert known.json()["message"] == unknown.json()["message"]
    assert firebase == ["+91" + MOBILE]
    bad = app.client.post(PREFIX + "/verify-reset-otp", json={"challenge_id": known.json()["challenge_id"], "otp": "000000", "firebase_verified": True})
    assert bad.status_code == 400
    verified = app.verify(known.json()["challenge_id"], "123456")
    assert verified.status_code == 200, verified.text
    assert app.reset(verified.json()["token"]).status_code == 200
    assert app.verify(unknown.json()["challenge_id"], "123456").status_code == 400
