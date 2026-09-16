"""OTP sign-in regression tests; all provider delivery uses the isolated fixture."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from test_auth_recovery import recovery_app, PREFIX, EMAIL, MOBILE, PASSWORD, OTP


def login(app, identifier=EMAIL, password=PASSWORD):
    return app.client.post(PREFIX + "/login", json={"identifier": identifier, "password": password})


def verify(app, challenge, otp=OTP):
    return app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": challenge, "otp": otp})


def resend(app, challenge):
    return app.client.post(PREFIX + "/resend-login-otp", json={"challenge_id": challenge})


@pytest.mark.parametrize("identifier", [EMAIL, MOBILE])
def test_password_and_registered_email_otp_required_before_session(recovery_app, identifier):
    app = recovery_app
    registration = app.register()
    assert registration.status_code == 201
    assert registration.json()["requires_login"] is True
    assert "access_token" not in registration.json()
    assert app.client.get(PREFIX + "/me").status_code == 401
    assert login(app, password="wrong-password").status_code == 401
    assert login(app, identifier="unknown@example.com").status_code == 401
    assert not app.mail
    pending = login(app, identifier=identifier)
    assert pending.status_code == 200, pending.text
    assert pending.json()["channel"] == "email"
    assert pending.json()["expires_in"] == 300 and pending.json()["resend_after"] == 60
    assert "access_token" not in pending.json() and OTP not in pending.text and EMAIL not in pending.text
    assert [m["recipient"] for m in app.mail] == [EMAIL]
    assert "sign-in" in app.mail[0]["body"]
    challenge = pending.json()["challenge_id"]
    row = app.sql("SELECT * FROM login_otp_challenges WHERE id=?", (challenge,))[0]
    assert row["otp_hash"] != OTP and row["consumed_at"] is None
    assert verify(app, challenge, "000000").status_code == 400
    authenticated = verify(app, challenge)
    assert authenticated.status_code == 200, authenticated.text
    headers = {"Authorization": "Bearer " + authenticated.json()["access_token"]}
    assert app.client.get(PREFIX + "/me", headers=headers).json()["email"] == EMAIL
    assert verify(app, challenge).status_code == 410
    assert resend(app, challenge).status_code == 410


def test_resend_rotates_challenge_and_account_cooldown_covers_all_identifiers(recovery_app, monkeypatch):
    from src.modules.auth import login_otp
    app = recovery_app
    app.register()
    first = login(app).json()["challenge_id"]
    assert resend(app, first).status_code == 429
    assert login(app, identifier=MOBILE).status_code == 429
    assert len(app.mail) == 1
    app.sql("UPDATE login_otp_state SET next_send_at='2000-01-01'")
    monkeypatch.setattr(login_otp, "otp_text", lambda: "654321")
    second = resend(app, first)
    assert second.status_code == 200
    assert second.json()["challenge_id"] != first
    assert len(app.mail) == 2
    assert verify(app, first).status_code == 410
    assert verify(app, second.json()["challenge_id"]).status_code == 400
    assert verify(app, second.json()["challenge_id"], "654321").status_code == 200


@pytest.mark.parametrize("correct", [True, False])
def test_concurrent_codes_are_single_use_and_cannot_exceed_attempt_limit(recovery_app, correct):
    app = recovery_app
    app.register()
    challenge = login(app).json()["challenge_id"]
    workers = 2 if correct else 8
    ready = Barrier(workers)
    def submit(_):
        ready.wait(timeout=10)
        return verify(app, challenge, OTP if correct else "000000").status_code
    with ThreadPoolExecutor(max_workers=workers) as executor:
        statuses = list(executor.map(submit, range(workers)))
    row = app.sql("SELECT attempts,consumed_at FROM login_otp_challenges WHERE id=?", (challenge,))[0]
    if correct:
        assert sorted(statuses) == [200, 410]
        assert row["attempts"] == 1 and row["consumed_at"]
    else:
        assert statuses.count(400) == 4 and statuses.count(410) == 4
        assert row["attempts"] == 5
        assert verify(app, challenge).status_code == 410
        assert resend(app, challenge).status_code == 410


@pytest.mark.parametrize("mutation", ["UPDATE login_otp_challenges SET expires_at='2000-01-01'", "UPDATE users SET auth_version=auth_version+1", "UPDATE users SET is_active=0", "UPDATE users SET hashed_password='changed-hash'", "UPDATE users SET email='other@example.com'"])
def test_expiry_and_account_changes_invalidate_pending_signin(recovery_app, mutation):
    app = recovery_app
    app.register()
    challenge = login(app).json()["challenge_id"]
    app.sql(mutation)
    assert verify(app, challenge).status_code == 410
    assert resend(app, challenge).status_code == 410


def test_password_recovery_and_login_codes_are_not_interchangeable(recovery_app):
    app = recovery_app
    app.register()
    challenge = login(app).json()["challenge_id"]
    recovery = app.challenge()
    assert app.verify(challenge).status_code == 410
    assert verify(app, recovery).status_code == 410
    reset_grant = app.verify(recovery).json()["token"]
    assert verify(app, reset_grant).status_code in (410, 422)
    assert app.reset(reset_grant).status_code == 200
    assert verify(app, challenge).status_code == 410


def test_provider_failures_never_authenticate_or_expose_codes(recovery_app, monkeypatch):
    from src.modules.auth import login_otp
    app = recovery_app
    app.register()
    assert app.client.get(PREFIX + "/login-methods").json() == {"email": True, "provider": "brevo"}
    monkeypatch.setattr(login_otp.email_client, "email_ready", lambda: False)
    assert login(app).status_code == 503
    assert not app.sql("SELECT * FROM login_otp_challenges")
    monkeypatch.setattr(login_otp.email_client, "email_ready", lambda: True)
    app.deliver = False
    failure = login(app)
    assert failure.status_code == 503 and "access_token" not in failure.json() and OTP not in failure.text
    challenge = app.sql("SELECT id FROM login_otp_challenges")[0][0]
    assert verify(app, challenge).status_code == 410
    assert login(app).status_code == 429
    app.sql("UPDATE login_otp_state SET next_send_at='2000-01-01'")
    app.deliver = True
    pending = login(app)
    assert verify(app, pending.json()["challenge_id"]).status_code == 200


def test_legacy_auth_route_does_not_bypass_otp_and_refresh_requires_reauthentication(recovery_app):
    app = recovery_app
    app.register()
    pending = app.client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert pending.status_code == 200
    assert "access_token" not in pending.json() and "refresh_token" not in pending.json()
    assert verify(app, pending.json()["challenge_id"]).status_code == 200
    assert app.client.post("/api/v1/auth/refresh", json={"refresh_token": "legacy-token"}).status_code == 401
