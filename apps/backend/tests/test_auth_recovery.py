"""Password recovery regressions with an isolated database and no real delivery."""
import base64
import io
import sqlite3
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from threading import Barrier

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool


PREFIX = "/api/v1/citizen"
CAPTCHA = "ABC234"
OTP = "481926"
EMAIL = "recovery@example.com"
MOBILE = "9876543210"
PASSWORD = "original-long-password"


@dataclass
class RecoveryApp:
    client: TestClient
    database: Path
    mail: list = field(default_factory=list)
    sms: list = field(default_factory=list)
    deliver: bool = True

    def sql(self, statement, parameters=()):
        with sqlite3.connect(self.database) as connection:
            connection.row_factory = sqlite3.Row
            return connection.execute(statement, parameters).fetchall()

    def captcha(self):
        response = self.client.get(PREFIX + "/captcha")
        assert response.status_code == 200, response.text
        return {"captcha_id": response.json()["captcha_id"], "captcha_answer": CAPTCHA}

    def register(self, **overrides):
        payload = {"full_name": "Recovery Tester", "email": EMAIL, "mobile": MOBILE,
                   "password": PASSWORD, **overrides, **self.captcha()}
        return self.client.post(PREFIX + "/register", json=payload)

    def forgot(self, identifier=EMAIL, channel=None):
        return self.client.post(PREFIX + "/forgot-password", json={
            "identifier": identifier, "channel": channel or ("email" if "@" in identifier else "mobile"), **self.captcha()})

    def challenge(self, identifier=EMAIL):
        response = self.forgot(identifier)
        assert response.status_code == 200, response.text
        return response.json()["challenge_id"]

    def verify(self, challenge_id, otp=OTP):
        return self.client.post(PREFIX + "/verify-reset-otp", json={
            "challenge_id": challenge_id, "otp": otp})

    def reset(self, token, password="replacement-long-password"):
        return self.client.post(PREFIX + "/reset-password", json={
            "token": token, "password": password})


@pytest.fixture
def recovery_app(tmp_path, monkeypatch):
    # The app uses its own engine even when other tests have already imported settings.
    database = tmp_path / "recovery.db"
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///" + str(database))
    monkeypatch.setenv("JWT_SECRET_KEY", "recovery-tests-only-secret-not-for-production")
    from src.config.database import Base, get_db
    from src.config.settings import settings
    from src.middlewares.error_handler import register_exception_handlers
    from src.middlewares.rate_limiter import limiter
    from src.modules.auth import recovery, router as auth_router
    from src.modules.public import citizen

    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "recovery-tests-only-secret-not-for-production")
    monkeypatch.setattr(limiter, "enabled", False)
    monkeypatch.setattr(recovery, "captcha_text", lambda: CAPTCHA)
    monkeypatch.setattr(recovery, "otp_text", lambda: OTP)
    monkeypatch.setattr(recovery.email_client, "email_ready", lambda: True)
    monkeypatch.setattr(recovery.sms_client, "otp_sms_ready", lambda: True)
    engine = create_async_engine("sqlite+aiosqlite:///" + str(database), poolclass=NullPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(app):
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        try:
            yield
        finally:
            await engine.dispose()

    async def isolated_db():
        async with sessions() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app = FastAPI(lifespan=lifespan)
    app.state.limiter = limiter
    app.include_router(citizen.router, prefix="/api/v1")
    app.include_router(auth_router.router, prefix="/api/v1")
    app.dependency_overrides[get_db] = isolated_db
    register_exception_handlers(app)
    with TestClient(app) as client:
        harness = RecoveryApp(client, database)

        async def capture_mail(recipient, subject, body):
            harness.mail.append({"recipient": recipient, "subject": subject, "body": body})
            return harness.deliver

        async def capture_sms(recipient, code):
            harness.sms.append({"recipient": recipient, "code": code})
            return harness.deliver

        monkeypatch.setattr(recovery.email_client, "send_email", capture_mail)
        monkeypatch.setattr(recovery.sms_client, "send_reset_otp", capture_sms)
        yield harness


def test_legacy_user_upgrade_is_additive_idempotent_and_preserves_accounts(recovery_app, tmp_path):
    from src.config.database import Base
    from src.config.schema import upgrade_user_schema
    from src.modules.users.models import User, UserRole

    engine = create_engine("sqlite:///" + str(tmp_path / "legacy.db"))
    try:
        with engine.begin() as connection:
            connection.exec_driver_sql("""CREATE TABLE users (
                id CHAR(32) PRIMARY KEY, mobile VARCHAR(10) UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE, hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL,
                is_active BOOLEAN NOT NULL, is_verified BOOLEAN NOT NULL,
                created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL
            )""")
            connection.exec_driver_sql("""INSERT INTO users VALUES (
                '12345678123456781234567812345678', '9876543210', 'legacy@example.com',
                'existing-password-hash', 'Existing Citizen', 'CITIZEN', 1, 1,
                '2025-01-01 12:00:00', '2025-02-01 12:00:00'
            )""")
            Base.metadata.create_all(connection)
            assert "reset_token" not in {c["name"] for c in inspect(connection).get_columns("users")}
            upgrade_user_schema(connection)
            upgrade_user_schema(connection)
            names = [c["name"] for c in inspect(connection).get_columns("users")]
            for addition in ("reset_token", "reset_token_expires_at", "auth_version"):
                assert names.count(addition) == 1
        with Session(engine) as session:
            user = session.execute(select(User)).scalar_one()
            assert user.email == "legacy@example.com"
            assert user.mobile == MOBILE
            assert user.full_name == "Existing Citizen"
            assert user.hashed_password == "existing-password-hash"
            assert user.role == UserRole.CITIZEN and user.is_active and user.is_verified
            assert user.created_at.isoformat() == "2025-01-01T12:00:00"
            assert user.updated_at.isoformat() == "2025-02-01T12:00:00"
            assert user.auth_version == 0
            assert user.reset_token is None and user.reset_token_expires_at is None
    finally:
        engine.dispose()


def test_captcha_is_png_and_wrong_expired_or_reused_answers_fail(recovery_app):
    app = recovery_app
    response = app.client.get(PREFIX + "/captcha")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"captcha_id", "image", "expires_in"}
    assert payload["expires_in"] == 300
    assert payload["image"].startswith("data:image/png;base64,")
    with Image.open(io.BytesIO(base64.b64decode(payload["image"].split(",", 1)[1]))) as image:
        assert image.format == "PNG"
        assert image.width >= 200 and image.height >= 60
        image.verify()
    row = app.sql("SELECT answer_hash FROM captcha_challenges WHERE id = ?", (payload["captcha_id"],))[0]
    assert row["answer_hash"] != CAPTCHA
    request = {"identifier": EMAIL, "captcha_id": payload["captcha_id"], "captcha_answer": "WRONG2"}
    assert app.client.post(PREFIX + "/forgot-password", json=request).status_code == 400
    request["captcha_answer"] = CAPTCHA
    assert app.client.post(PREFIX + "/forgot-password", json=request).status_code == 400

    expired = app.captcha()
    app.sql("UPDATE captcha_challenges SET expires_at = '2000-01-01' WHERE id = ?", (expired["captcha_id"],))
    assert app.client.post(PREFIX + "/forgot-password", json={"identifier": EMAIL, **expired}).status_code == 400
    assert app.client.post(PREFIX + "/forgot-password", json={"identifier": EMAIL}).status_code == 422

    signup = {"full_name": "Captcha Tester", "email": EMAIL, "mobile": MOBILE, "password": PASSWORD}
    assert app.client.post(PREFIX + "/register", json=signup).status_code == 422
    signup.update(app.captcha())
    assert app.client.post(PREFIX + "/register", json=signup).status_code == 201
    assert app.client.post(PREFIX + "/register", json=signup).status_code == 400


@pytest.mark.parametrize("duplicate", [{"email": EMAIL, "mobile": "9876543211"},
                                        {"email": "another@example.com", "mobile": MOBILE}])
def test_duplicate_email_or_mobile_has_clear_existing_account_feedback(recovery_app, duplicate):
    assert recovery_app.register().status_code == 201
    response = recovery_app.register(**duplicate)
    assert response.status_code == 409, response.text
    assert "already" in response.text.lower()
    assert "sign in" in response.text.lower()
    assert "reset" in response.text.lower()
    assert len(recovery_app.sql("SELECT id FROM users")) == 1


def test_reset_requires_valid_otp_preserves_spaces_and_revokes_old_sessions(recovery_app):
    app = recovery_app
    registered = app.register()
    assert registered.status_code == 201, registered.text
    old_headers = {"Authorization": "Bearer " + registered.json()["access_token"]}
    login = app.client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert login.status_code == 200, login.text
    old_pair = login.json()
    assert app.client.get(PREFIX + "/me", headers=old_headers).status_code == 200

    forgot = app.forgot()
    assert forgot.status_code == 200, forgot.text
    assert set(forgot.json()) == {"challenge_id", "message", "expires_in", "resend_after"}
    assert forgot.json()["expires_in"] == 300 and forgot.json()["resend_after"] == 60
    assert OTP not in forgot.text
    challenge = forgot.json()["challenge_id"]
    assert len(app.mail) == 1 and app.mail[0]["recipient"] == EMAIL
    assert OTP in app.mail[0]["body"]
    row = app.sql("SELECT * FROM password_recovery_challenges WHERE id = ?", (challenge,))[0]
    assert row["otp_hash"] != OTP
    assert row["grant_hash"] is None
    assert app.reset(challenge).status_code == 410
    assert app.reset("made-up-reset-authorization").status_code == 410
    assert app.verify(challenge, "000000").status_code == 400
    assert app.sql("SELECT grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0][0] is None

    verified = app.verify(challenge)
    assert verified.status_code == 200, verified.text
    assert set(verified.json()) == {"token", "expires_in"}
    assert verified.json()["expires_in"] == 300
    token = verified.json()["token"]
    assert app.sql("SELECT grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0][0] != token
    assert app.verify(challenge).status_code == 410
    password = "  new password with spaces  "
    assert app.reset(token, password).status_code == 200
    assert app.reset(token).status_code == 410
    assert app.client.get(PREFIX + "/me", headers=old_headers).status_code == 401
    assert app.client.get(PREFIX + "/me", headers={"Authorization": "Bearer " + old_pair["access_token"]}).status_code == 401
    assert app.client.post("/api/v1/auth/refresh", json={"refresh_token": old_pair["refresh_token"]}).status_code == 401
    assert all(row["revoked"] for row in app.sql("SELECT revoked FROM refresh_tokens"))
    assert app.sql("SELECT auth_version FROM users")[0][0] == 1
    for invalid_password in (PASSWORD, password.strip()):
        assert app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": invalid_password}).status_code == 401
    current = app.client.post(PREFIX + "/login", json={"identifier": MOBILE, "password": password})
    assert current.status_code == 200, current.text
    assert app.client.get(PREFIX + "/me", headers={"Authorization": "Bearer " + current.json()["access_token"]}).status_code == 200


def test_otp_attempt_limit_cannot_be_bypassed_with_correct_code(recovery_app):
    app = recovery_app
    assert app.register().status_code == 201
    challenge = app.challenge()
    for _ in range(4):
        assert app.verify(challenge, "000000").status_code == 400
    assert app.verify(challenge, "000000").status_code == 410
    assert app.verify(challenge).status_code == 410
    row = app.sql("SELECT attempts, grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0]
    assert row["attempts"] == 5 and row["grant_hash"] is None


@pytest.mark.parametrize("correct", [False, True])
def test_concurrent_otp_requests_enforce_attempt_limit_and_single_verification(recovery_app, correct):
    app = recovery_app
    assert app.register().status_code == 201
    challenge = app.challenge()
    workers = 2 if correct else 8
    ready = Barrier(workers)

    def submit(_):
        ready.wait(timeout=10)
        return app.verify(challenge, OTP if correct else "000000")

    with ThreadPoolExecutor(max_workers=workers) as pool:
        responses = list(pool.map(submit, range(workers)))
    statuses = [response.status_code for response in responses]
    row = app.sql("SELECT attempts, grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0]
    if correct:
        assert sorted(statuses) == [200, 410]
        assert row["attempts"] == 1 and row["grant_hash"]
    else:
        assert statuses.count(400) == 4 and statuses.count(410) == 4
        assert row["attempts"] == 5 and row["grant_hash"] is None
        assert app.verify(challenge).status_code == 410


def test_reset_authorization_is_consumed_atomically(recovery_app):
    app = recovery_app
    assert app.register().status_code == 201
    verified = app.verify(app.challenge())
    assert verified.status_code == 200, verified.text
    token = verified.json()["token"]
    ready = Barrier(2)

    def submit(_):
        ready.wait(timeout=10)
        return app.reset(token)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, range(2)))
    assert sorted(response.status_code for response in responses) == [200, 410]
    assert app.sql("SELECT auth_version FROM users")[0][0] == 1


def test_expired_otp_cannot_issue_reset_authorization(recovery_app):
    app = recovery_app
    assert app.register().status_code == 201
    challenge = app.challenge()
    app.sql("UPDATE password_recovery_challenges SET expires_at = '2000-01-01' WHERE id = ?", (challenge,))
    assert app.verify(challenge).status_code == 410
    assert app.sql("SELECT grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0][0] is None


def test_expired_reset_authorization_cannot_change_password(recovery_app):
    app = recovery_app
    assert app.register().status_code == 201
    challenge = app.challenge()
    verified = app.verify(challenge)
    assert verified.status_code == 200, verified.text
    app.sql("UPDATE password_recovery_challenges SET grant_expires_at = '2000-01-01' WHERE id = ?", (challenge,))
    assert app.reset(verified.json()["token"]).status_code == 410
    assert app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": PASSWORD}).status_code == 200


@pytest.mark.parametrize("verify_before_resend", [False, True])
def test_resend_cooldown_covers_email_and_mobile_and_invalidates_previous_challenge(recovery_app, monkeypatch, verify_before_resend):
    from src.modules.auth import recovery

    app = recovery_app
    assert app.register().status_code == 201
    original = app.challenge()
    grant = app.verify(original).json()["token"] if verify_before_resend else None
    for identifier in (EMAIL, EMAIL):
        cooldown = app.forgot(identifier)
        assert cooldown.status_code == 429, cooldown.text
        assert cooldown.headers["retry-after"] == "60"
    assert len(app.mail) == 1
    app.sql("UPDATE password_recovery_state SET next_send_at = '2000-01-01'")
    monkeypatch.setattr(recovery, "otp_text", lambda: "572830")
    replacement = app.challenge(MOBILE)
    assert replacement != original and len(app.mail) == 1 and len(app.sms) == 1
    assert app.verify(original).status_code == 410
    if grant:
        assert app.reset(grant).status_code == 410
    assert app.verify(replacement, OTP).status_code == 400
    assert app.verify(replacement, "572830").status_code == 200


def test_missing_provider_and_delivery_failure_do_not_leak_codes_and_allow_retry(recovery_app, monkeypatch):
    from src.modules.auth import recovery

    app = recovery_app
    assert app.register().status_code == 201
    monkeypatch.setattr(recovery.email_client, "email_ready", lambda: False)
    for identifier in (EMAIL, "unknown@example.com"):
        response = app.forgot(identifier)
        assert response.status_code == 503, response.text
        assert OTP not in response.text and "challenge_id" not in response.json()
    assert not app.mail
    assert not app.sql("SELECT id FROM password_recovery_challenges")
    monkeypatch.setattr(recovery.email_client, "email_ready", lambda: True)
    app.deliver = False
    failed = app.forgot()
    # A delivery failure must not distinguish a registered contact from an unknown one.
    assert failed.status_code == 200, failed.text
    assert OTP not in failed.text and "token" not in failed.json()
    unknown = app.forgot("unknown2@example.com")
    assert unknown.status_code == failed.status_code
    assert unknown.json()["message"] == failed.json()["message"]
    assert app.forgot().status_code == 429
    app.sql("UPDATE password_recovery_state SET next_send_at = '2000-01-01'")
    app.deliver = True
    assert app.forgot().status_code == 200



@pytest.mark.parametrize("inactive", [False, True])
def test_unknown_and_inactive_accounts_use_generic_response_and_cannot_reset(recovery_app, inactive):
    app = recovery_app
    assert app.register().status_code == 201
    known = app.forgot()
    assert known.status_code == 200, known.text
    identifier = "unknown@example.com"
    if inactive:
        assert app.register(email="inactive@example.com", mobile="9876543211").status_code == 201
        app.sql("UPDATE users SET is_active = 0 WHERE email = ?", ("inactive@example.com",))
        identifier = "inactive@example.com"
    unknown = app.forgot(identifier)
    assert unknown.status_code == 200, unknown.text
    assert unknown.json().keys() == known.json().keys()
    assert unknown.json()["message"] == known.json()["message"]
    assert OTP not in unknown.text
    assert len(app.mail) == 1
    challenge = unknown.json()["challenge_id"]
    assert app.verify(challenge).status_code == 400
    row = app.sql("SELECT user_id, grant_hash FROM password_recovery_challenges WHERE id = ?", (challenge,))[0]
    assert row["user_id"] is None and row["grant_hash"] is None
    assert app.forgot(identifier).status_code == 429


@pytest.mark.parametrize("otp", ["12345", "1234567", "ABC234", " 481926 "])
def test_otp_must_be_exactly_six_digits(recovery_app, otp):
    assert recovery_app.verify("unknown-challenge-identifier", otp).status_code == 422


@pytest.mark.parametrize("channel,contact", [("email", EMAIL), ("mobile", MOBILE)])
def test_both_channels_complete_reset_and_only_deliver_to_selected_registered_contact(recovery_app, channel, contact):
    app = recovery_app
    assert app.register().status_code == 201
    response = app.forgot(contact, channel=channel)
    assert response.status_code == 200
    assert response.json()["expires_in"] == 300
    if channel == "email":
        assert [mail["recipient"] for mail in app.mail] == [EMAIL]
        assert not app.sms
    else:
        assert app.sms == [{"recipient": MOBILE, "code": OTP}]
        assert not app.mail
    verified = app.verify(response.json()["challenge_id"])
    assert verified.status_code == 200
    assert app.reset(verified.json()["token"], "replacement-password").status_code == 200
    assert app.client.post(PREFIX + "/login", json={"identifier": contact, "password": PASSWORD}).status_code == 401
    assert app.client.post(PREFIX + "/login", json={"identifier": contact, "password": "replacement-password"}).status_code == 200
    assert app.reset(verified.json()["token"]).status_code == 410


@pytest.mark.parametrize("channel,unknown", [("email", "unknown@example.com"), ("mobile", "9876543218")])
def test_unregistered_contacts_never_receive_codes_and_get_same_response(recovery_app, channel, unknown):
    app = recovery_app
    assert app.register().status_code == 201
    known = app.forgot(EMAIL if channel == "email" else MOBILE, channel=channel)
    response = app.forgot(unknown, channel=channel)
    assert response.status_code == known.status_code == 200
    assert response.json().keys() == known.json().keys()
    assert response.json()["message"] == known.json()["message"]
    assert len(app.mail) + len(app.sms) == 1
    assert app.verify(response.json()["challenge_id"]).status_code == 400
    assert app.forgot(unknown, channel=channel).status_code == 429


@pytest.mark.parametrize("channel,identifier", [("mobile", EMAIL), ("email", MOBILE), ("fax", EMAIL), ("mobile", "+919876543210")])
def test_recovery_channel_validates_its_own_contact(recovery_app, channel, identifier):
    response = recovery_app.forgot(identifier, channel=channel)
    assert response.status_code == 422
    assert not recovery_app.mail and not recovery_app.sms


def test_mobile_recovery_does_not_require_gmail_and_missing_sms_does_not_reveal_account(recovery_app, monkeypatch):
    from src.modules.auth import recovery
    app = recovery_app
    assert app.register().status_code == 201
    monkeypatch.setattr(recovery.email_client, "email_ready", lambda: False)
    assert app.forgot(MOBILE, channel="mobile").status_code == 200
    assert len(app.sms) == 1 and not app.mail
    monkeypatch.setattr(recovery.sms_client, "otp_sms_ready", lambda: False)
    known = app.forgot(MOBILE, channel="mobile")
    unknown = app.forgot("9876543218", channel="mobile")
    assert known.status_code == unknown.status_code == 503
    assert known.json() == unknown.json()
