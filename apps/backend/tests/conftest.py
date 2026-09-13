"""Tests never inherit live delivery credentials from a developer's .env."""
import os
for key in ("FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "SMTP_PASSWORD", "RESEND_API_KEY", "MSG91_AUTH_KEY", "GEMINI_API_KEY", "CHATBOT_API_KEY", "BHASHINI_API_KEY", "BHASHINI_USER_ID"):
    os.environ[key] = ""
os.environ["SMS_PROVIDER"] = "msg91"

import tempfile, uuid
from pathlib import Path
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + str(Path(tempfile.gettempdir()) / ("schemesathi-suite-" + uuid.uuid4().hex + ".db"))
os.environ["JWT_SECRET_KEY"] = "isolated-suite-only-never-deploy-this-secret"
