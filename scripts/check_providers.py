"""Check private provider configuration without displaying secrets or sending messages.

Run from any directory with the project's Python environment. By default this is
an offline check. --check-smtp additionally authenticates over TLS and quits;
it never sends mail, requests an OTP or calls a paid SMS/voice API.
"""
import argparse
from email.utils import parseaddr
import os
from pathlib import Path
import smtplib
import ssl
from urllib.parse import urlsplit

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


def check_email(values):
    provider = values.get("EMAIL_PROVIDER", "smtp")
    if provider == "smtp":
        report(values, "Email (SMTP)", ("EMAIL_FROM_ADDRESS", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"))
        print("Render Free blocks SMTP ports 25/465/587. Use HTTPS email for the hosted site.")
    elif provider == "resend":
        report(values, "Email (Resend HTTPS)", ("EMAIL_FROM_ADDRESS", "RESEND_API_KEY"))
        sender = parseaddr(str(values.get("EMAIL_FROM_ADDRESS") or ""))[1]
        domain = sender.rsplit("@", 1)[-1].lower() if "@" in sender else ""
        if domain == "resend.dev":
            print("Resend test sender: can send only to the email address of your Resend account.")
        elif domain in {"gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "yahoo.com"}:
            print("Resend sender uses a shared mailbox domain you cannot verify. Use your verified domain, or the Apps Script Gmail adapter.")
        elif not domain:
            print("Resend sender: enter a valid EMAIL_FROM_ADDRESS on your verified sending domain.")
        else:
            print("Resend: check sender-domain verification, API-key permissions and rejected requests in its dashboard.")
    elif provider == "apps_script":
        report(values, "Email (Google Apps Script HTTPS)", ("EMAIL_FROM_ADDRESS", "APPS_SCRIPT_URL", "APPS_SCRIPT_SECRET"))
        try:
            url = urlsplit(str(values.get("APPS_SCRIPT_URL") or ""))
            valid_url = url.scheme == "https" and url.hostname == "script.google.com" and url.path.endswith("/exec")
        except ValueError:
            valid_url = False
        if not valid_url:
            print("Apps Script: use the deployed HTTPS script.google.com web-app URL ending in /exec.")
        if len(str(values.get("APPS_SCRIPT_SECRET") or "")) < 32:
            print("Apps Script: APPS_SCRIPT_SECRET must contain at least 32 characters and match BRIDGE_SECRET.")
        print("Apps Script: deploy as Me with access Anyone; EMAIL_FROM_ADDRESS must match the deploying account. Sending quotas apply.")
    else:
        print("Email: select EMAIL_PROVIDER=smtp, resend or apps_script.")


def check_phone(values):
    provider = values.get("SMS_PROVIDER", "firebase")
    if provider == "firebase":
        report(values, "Phone OTP / Firebase backend", ("FIREBASE_API_KEY", "FIREBASE_PROJECT_ID"))
        report(values, "Firebase browser configuration", ("FIREBASE_AUTH_DOMAIN", "FIREBASE_APP_ID"))
        print("Phone OTP: the browser obtains reCAPTCHA proof; the backend requests SMS and verifies the code.")
        print("Firebase: enable Phone sign-in, authorize your deployed hostname and allow India in SMS regions.")
        print("Actual Firebase verification SMS requires Blaze billing. Test phone numbers use configured codes and send no SMS.")
    elif provider == "msg91":
        report(values, "Phone OTP / MSG91 Flow", ("MSG91_AUTH_KEY", "MSG91_SENDER_ID", "MSG91_OTP_TEMPLATE_ID"))
        print("MSG91: use an approved SMS Flow with the otp variable, provider credit and required sender/DLT approvals.")
    else:
        print("Phone OTP: select SMS_PROVIDER=firebase or msg91. Other SMS adapters do not implement recovery OTP.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-smtp", action="store_true",
                        help="Authenticate to the configured SMTP server over TLS; send no email")
    parser.add_argument("--runtime-only", action="store_true",
                        help="Check only process environment, ignoring the local backend .env")
    args = parser.parse_args()
    values = {**({} if args.runtime_only else dotenv_values(BACKEND_ENV)), **os.environ}
    source = "process environment only" if args.runtime_only else "apps/backend/.env plus process environment"
    print("Configuration source: " + source + ". Values are hidden.")
    print("Local settings do not confirm or update your Render service environment.")
    check_email(values)
    check_phone(values)
    report(values, "Bhashini", ("BHASHINI_USER_ID", "BHASHINI_API_KEY", "BHASHINI_PIPELINE_ID"))
    report(values, "Hosting", ("DATABASE_URL", "JWT_SECRET_KEY", "PUBLIC_SITE_URL"))
    print("Presence checks do not establish provider approval, account balance, delivery or deployment.")
    if args.check_smtp and not verify_smtp(values):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
