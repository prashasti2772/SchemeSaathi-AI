"""Citizen data regressions using only disposable SQLite and mocked delivery."""
import asyncio
import uuid
import pytest

from sqlalchemy import select
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from test_auth_recovery import recovery_app, PREFIX, EMAIL, PASSWORD, OTP


def sign_in(app, email=EMAIL, password=PASSWORD):
    pending = app.client.post(PREFIX + "/login", json={"identifier": email, "password": password})
    assert pending.status_code == 200, pending.text
    verified = app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": pending.json()["challenge_id"], "otp": OTP})
    assert verified.status_code == 200, verified.text
    return {"Authorization": "Bearer " + verified.json()["access_token"]}


def test_profile_fields_merge_preserves_legacy_and_other_accounts(recovery_app):
    app = recovery_app
    assert app.register().status_code == 201
    owner = sign_in(app)
    path = PREFIX + "/scheme-profile"
    assert app.client.get(path).status_code == 401
    assert app.client.get(path, headers=owner).json() == {"exists": False, "personal": {}, "business": {}, "other": {}}
    assert app.client.patch(path, headers=owner, json={"personal": {"age": "20", "state": "Kerala"},
             "business": {"businessActivity": "Tailoring"}, "other": {"annualIncome": "120000"}}).status_code == 200
    saved = app.client.patch(path, headers=owner, json={"personal": {"education": "Graduate", "occupation": "Student",
            "interests": "Education", "welfareNeeds": "Scholarships", "entrepreneurshipSupport": "No"}})
    assert saved.status_code == 200, saved.text
    assert saved.json()["personal"]["age"] == "20"
    assert saved.json()["business"]["businessActivity"] == "Tailoring"
    assert saved.json()["other"]["annualIncome"] == "120000"
    response = app.client.get(path, headers=owner)
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["personal"]["occupation"] == "Student"
    cleared = app.client.patch(path, headers=owner, json={"other": {"annualIncome": None}})
    assert cleared.json()["other"]["annualIncome"] is None
    assert app.client.patch(path, headers=owner, json={"personal": {"unexpected": "answer"}}).status_code == 422
    assert app.client.patch(path, headers=owner, json={"personal": {"interests": "x" * 501}}).status_code == 422
    assert app.register(email="other-citizen@example.com", mobile=None).status_code == 201
    other = sign_in(app, "other-citizen@example.com")
    assert app.client.get(path, headers=other).json()["exists"] is False
    # A fresh session on a new engine still reads the committed record.
    async def read_after_restart():
        from src.modules.public.scheme_profile import SchemeProfile
        engine = create_async_engine("sqlite+aiosqlite:///" + str(app.database))
        try:
            async with async_sessionmaker(engine)() as session:
                row = (await session.execute(select(SchemeProfile))).scalar_one()
                return row.personal, row.business
        finally:
            await engine.dispose()
    personal, business = asyncio.run(read_after_restart())
    assert personal["occupation"] == "Student" and business["businessActivity"] == "Tailoring"


def test_saved_schemes_are_idempotent_account_scoped_and_persisted(recovery_app, monkeypatch):
    from src.modules.public import saved_schemes
    record = {"scheme_id": "verified-education", "id": "verified-education", "name": "Verified education fixture"}
    monkeypatch.setattr(saved_schemes, "scheme_view", lambda key: record if key == record["scheme_id"] else None)
    app = recovery_app
    app.register()
    owner = sign_in(app)
    path = PREFIX + "/saved-schemes"
    assert app.client.get(path).status_code == 401
    assert app.client.put(path + "/unknown", headers=owner).status_code == 404
    for _ in range(2):
        assert app.client.put(path + "/verified-education", headers=owner).json()["saved"] is True
    assert app.client.get(path, headers=owner).json()["schemes"] == [record]
    assert len(app.sql("SELECT * FROM citizen_saved_schemes")) == 1
    assert app.register(email="second@example.com", mobile=None).status_code == 201
    other = sign_in(app, "second@example.com")
    assert app.client.get(path, headers=other).json()["schemes"] == []
    assert app.client.delete(path + "/verified-education", headers=other).status_code == 204
    assert app.client.get(path, headers=owner).json()["schemes"] == [record]
    monkeypatch.setattr(saved_schemes, "scheme_view", lambda key: None)
    unavailable = app.client.get(path, headers=owner).json()["schemes"][0]
    assert unavailable["available"] is False and "apply_url" not in unavailable
    for _ in range(2):
        assert app.client.delete(path + "/verified-education", headers=owner).status_code == 204
    assert app.client.get(path, headers=owner).json()["schemes"] == []


def test_profile_merge_compiles_for_postgresql():
    from sqlalchemy.dialects.postgresql import insert
    from src.modules.public.scheme_profile import SchemeProfile, merge_answers
    statement = insert(SchemeProfile).values(user_id=uuid.uuid4(), personal={"occupation": "Student"})
    statement = statement.on_conflict_do_update(index_elements=[SchemeProfile.user_id], set_={
        "personal": merge_answers(SchemeProfile.personal, {"occupation": "Student"}, "postgresql")})
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "ON CONFLICT" in sql and "||" in sql and "JSONB" in sql


def test_default_user_role_is_citizen():
    from src.modules.users.models import User, UserRole
    from src.modules.users.schemas import UserCreate
    assert User.__table__.c.role.default.arg == UserRole.CITIZEN
    assert UserCreate(email="citizen@example.com", password="valid-long-password", full_name="Citizen").role == UserRole.CITIZEN


def test_password_change_revokes_access_refresh_pending_otp_and_recovery_grant(recovery_app):
    from src.modules.users.router import router
    app = recovery_app
    app.client.app.include_router(router, prefix="/api/v1")
    assert app.register().status_code == 201
    pending = app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": PASSWORD}).json()
    session = app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": pending["challenge_id"], "otp": OTP}).json()
    headers = {"Authorization": "Bearer " + session["access_token"]}
    assert app.client.get("/api/v1/users/me", headers=headers).json()["mobile"] == "9876543210"
    grant = app.verify(app.challenge()).json()["token"]
    app.sql("UPDATE login_otp_state SET next_send_at='2000-01-01'")
    pending = app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": PASSWORD}).json()
    password = "new-verified-password"
    endpoint = "/api/v1/users/me/change-password"
    rejected = app.client.post(endpoint, headers=headers, json={"current_password": "wrong-password", "new_password": password})
    assert rejected.status_code == 401
    assert app.sql("SELECT auth_version FROM users")[0]["auth_version"] == 0
    assert app.client.post(endpoint, headers=headers, json={"current_password": PASSWORD, "new_password": password}).status_code == 204
    assert app.sql("SELECT auth_version FROM users")[0]["auth_version"] == 1
    assert all(row["revoked"] for row in app.sql("SELECT revoked FROM refresh_tokens"))
    assert app.client.get(PREFIX + "/me", headers=headers).status_code == 401
    assert app.client.post("/api/v1/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401
    assert app.client.post(PREFIX + "/verify-login-otp", json={"challenge_id": pending["challenge_id"], "otp": OTP}).status_code == 410
    assert app.reset(grant).status_code == 410
    app.sql("UPDATE login_otp_state SET next_send_at='2000-01-01'")
    assert app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": PASSWORD}).status_code == 401
    assert app.client.post(PREFIX + "/login", json={"identifier": EMAIL, "password": password}).status_code == 200


def test_users_password_and_name_validation_preserves_valid_spaces():
    from pydantic import ValidationError
    from src.modules.users.schemas import ChangePasswordRequest, UserCreate
    for field, value in [("full_name", "  "), ("password", " " * 12), ("password", "short")]:
        with pytest.raises(ValidationError):
            UserCreate(**{"email": "citizen@example.com", "password": "valid-long-password", "full_name": "Citizen", field: value})
    with pytest.raises(ValidationError):
        ChangePasswordRequest(current_password="current-password", new_password=" " * 12)
    phrase = "  valid passphrase  "
    assert ChangePasswordRequest(current_password="current-password", new_password=phrase).new_password == phrase
