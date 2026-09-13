"""Check private provider configuration without displaying secrets or sending messages.

Run from any directory with the project's Python environment. By default this is
an offline check. --check-smtp additionally authenticates over TLS and quits;
it never sends mail, requests an OTP or calls a paid SMS/voice API.
"""
import argparse
import os
from pathlib import Path
import smtplib
import ssl

from dotenv import dotenv_values


BACKEND_ENV = Path(__file__).resolve().parents[1] / "apps/backend/.env"
PLACEHOLDERS = ("replace-with", "your-provider", "your-flow", "your-approved",
                "your-sender", "your-user", "your-api", "change-this")


def configured(value):
    return bool(value and str(value).strip() and not any(
        marker in str(value).lower() for marker in PLACEHOLDERS))


def report(values, title, keys):
    missing = [key for key in keys if not configured(values.get(key))]
    print(title + ": " + ("missing/placeholder " + ", ".join(missing)
                           if missing else "values present; live service not verified"))
    return not missing


def verify_smtp(values):
    if values.get("EMAIL_PROVIDER", "smtp") != "smtp":
        print("SMTP check skipped: EMAIL_PROVIDER is not smtp.")
        return False
    required = ("EMAIL_FROM_ADDRESS", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD")
    if not all(configured(values.get(key)) for key in required):
        print("SMTP check skipped: complete the missing SMTP values first.")
        return False
    try:
        port = int(values.get("SMTP_PORT") or 587)
        use_ssl = str(values.get("SMTP_USE_SSL", "false")).lower() in {"true", "1", "yes"}
        context = ssl.create_default_context()
        if use_ssl:
            connection = smtplib.SMTP_SSL(values["SMTP_HOST"], port, timeout=10, context=context)
        else:
            connection = smtplib.SMTP(values["SMTP_HOST"], port, timeout=10)
        with connection as client:
            if not use_ssl:
                client.ehlo()
                client.starttls(context=context)
                client.ehlo()
            client.login(values["SMTP_USERNAME"], values["SMTP_PASSWORD"])
        print("SMTP authentication succeeded. No email was sent; inbox delivery is not verified.")
        return True
    except smtplib.SMTPAuthenticationError:
        print("SMTP authentication rejected. Check the username and provider app password privately.")
    except (smtplib.SMTPException, OSError, ValueError):
        # Provider errors can contain addresses or credentials. Never print them.
        print("SMTP connection/authentication could not complete. Check network access and TLS settings.")
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-smtp", action="store_true",
                        help="Authenticate to the configured SMTP server over TLS; send no email")
    args = parser.parse_args()
    values = {**dotenv_values(BACKEND_ENV), **os.environ}
    print("Configuration source: apps/backend/.env plus process environment. Values are hidden.")
    provider = values.get("EMAIL_PROVIDER", "smtp")
    if provider == "smtp":
        report(values, "Email (SMTP)", ("EMAIL_FROM_ADDRESS", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"))
        print("Render Free blocks SMTP ports 25/465/587. Use HTTPS email for the hosted site.")
    elif provider == "resend":
        report(values, "Email (Resend HTTPS)", ("EMAIL_FROM_ADDRESS", "RESEND_API_KEY"))
        print("Public-recipient email requires a verified sending domain; test sender access is limited.")
    else:
        print("Email: select EMAIL_PROVIDER=smtp or resend.")
    report(values, "Phone OTP / Firebase Auth",
           ("FIREBASE_API_KEY", "FIREBASE_PROJECT_ID"))
    print("Phone OTP is handled by Firebase Auth in the client app, not by the legacy MSG91 flow.")
    report(values, "Bhashini", ("BHASHINI_USER_ID", "BHASHINI_API_KEY", "BHASHINI_PIPELINE_ID"))
    report(values, "Hosting", ("DATABASE_URL", "JWT_SECRET_KEY", "PUBLIC_SITE_URL"))
    print("Presence checks do not establish provider approval, account balance, delivery or deployment.")
    if args.check_smtp and not verify_smtp(values):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
