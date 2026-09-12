"""Isolated Playwright fixture. Never import this module from the production app."""
import os
from pathlib import Path
import sys
import tempfile

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parents[1]

if __name__ == "__main__":
    # Fixed CAPTCHA/OTP only exist in this test process, with a throwaway database.
    with tempfile.TemporaryDirectory(prefix="schemesathi-browser-") as temporary:
        os.chdir(BACKEND)
        sys.path.insert(0, str(BACKEND))
        os.environ.update({
            "DATABASE_URL": "sqlite+aiosqlite:///" + str(Path(temporary) / "test.db"),
            "JWT_SECRET_KEY": "isolated-browser-tests-only-do-not-deploy",
            "ENV": "test", "GEMINI_API_KEY": "", "CHATBOT_API_KEY": "",
            "BHASHINI_API_KEY": "", "BHASHINI_USER_ID": "", "SMS_LIVE_ENABLED": "false",
            "STATIC_DIR": str(ROOT / "apps/frontend/dist"),
        })
        from src.main import app
        from src.modules.auth import recovery
        from src.integrations import email_client, sms_client
        import uvicorn

        recovery.captcha_text = lambda: "ABC234"
        recovery.otp_text = lambda: "123456"
        email_client.email_ready = lambda: True
        async def fake_email(*args, **kwargs):
            return True
        email_client.send_email = fake_email
        sms_client.otp_sms_ready = lambda: True
        sms_client.send_reset_otp = fake_email
        app.state.limiter.enabled = False
        uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")
