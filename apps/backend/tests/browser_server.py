"""Isolated Playwright fixture. Never import this module from the production app."""
import os
from pathlib import Path
import sys
import tempfile
import subprocess

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parents[1]

if __name__ == "__main__":
    # Fixed CAPTCHA/OTP only exist in this test process, with a throwaway database.
    with tempfile.TemporaryDirectory(prefix="schemesathi-browser-") as temporary:
        harness = Path(temporary) / "support-harness"
        subprocess.run(["node", str(ROOT / "apps/frontend/e2e/fixtures/build-support-harness.mjs"), str(harness)], check=True)
        os.chdir(BACKEND)
        sys.path.insert(0, str(BACKEND))
        os.environ.update({
            "DATABASE_URL": "sqlite+aiosqlite:///" + str(Path(temporary) / "test.db"),
            "JWT_SECRET_KEY": "isolated-browser-tests-only-do-not-deploy",
            "ENV": "test", "GEMINI_API_KEY": "", "CHATBOT_API_KEY": "",
            "BHASHINI_API_KEY": "", "BHASHINI_USER_ID": "", "BREVO_API_KEY": "", "EMAIL_PROVIDER": "brevo",
            "STATIC_DIR": str(ROOT / "apps/frontend/dist"),
        })
        from src.main import app
        from fastapi.responses import FileResponse
        from fastapi.staticfiles import StaticFiles
        # Test-only routes precede the production SPA catch-all.
        original_routes = list(app.router.routes)
        app.router.routes.clear()
        app.mount("/__tests/support-assets", StaticFiles(directory=harness), name="test-support-assets")
        @app.get("/__tests/support", include_in_schema=False)
        async def support_harness():
            return FileResponse(harness / "index.html")
        app.router.routes.extend(original_routes)
        from src.modules.auth import recovery, login_otp
        from src.integrations import email_client
        import uvicorn

        recovery.captcha_text = lambda: "ABC234"
        recovery.otp_text = lambda: "123456"
        login_otp.otp_text = lambda: "123456"
        email_client.email_ready = lambda: True
        async def fake_email(*args, **kwargs):
            return True
        email_client.send_email = fake_email
        app.state.limiter.enabled = False
        uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")
