# Login and password recovery OTP setup

The website offers email and mobile verification. Email supports Resend, a signed Google Apps Script HTTPS bridge, or SMTP. Mobile uses Firebase when `SMS_PROVIDER=firebase`, or an approved MSG91 SMS Flow when `SMS_PROVIDER=msg91`. The browser obtains Firebase reCAPTCHA proof; the backend requests the SMS and verifies the code.

Only an active account's registered contact receives a recovery code. Unknown and inactive contacts receive the same public response without a message being sent. A displayed OTP form does not prove delivery. Password-based login also requires OTP delivery, so configure a working contact method before asking users to sign in.

## Check the live Render configuration

1. Open Render, select your website service, then **Environment**.
2. Check `EMAIL_PROVIDER`, `EMAIL_FROM_ADDRESS` and the selected provider's credential names below. Local `apps/backend/.env` settings do not transfer to Render automatically.
3. Save changes and wait for the deployment to become **Live**.
4. On the live `/forgot-password` page, use the exact contact registered in the deployed database. Request one code, then check that inbox, including Spam, or the phone. Wait sixty seconds before requesting another.
5. If email does not arrive, search **Render > Logs** for `email_configuration_warning`, `email_delivery_failed`, or `email_provider_accepted`. The safe `reason` field helps identify failures. Provider acceptance means the request was accepted, not that the inbox received it; check the provider's dashboard for delivery or bounce details.

| Email reason | Action |
| --- | --- |
| `testing_sender_only` / `testing_recipient_restricted` | A `resend.dev` sender can email only the address associated with your Resend account. Use a verified domain for other recipients. |
| `use_a_verified_sending_domain` / `sender_domain_unverified` | Check **Resend > Domains** and make `EMAIL_FROM_ADDRESS` use a verified domain you own. |
| `api_key_rejected` | Privately replace the Render key with one permitted to send from that domain. |
| `quota_exceeded` / `rate_limited` | Check the provider's allowance and retry window. |
| `provider_timeout` / `network_error` / `provider_unavailable` | Check host connectivity and provider availability. Gmail SMTP cannot use Render Free's blocked ports. |

Do not share secrets or commit them to GitHub. Configuration presence does not prove domain verification, provider access or delivery.

## Resend HTTPS email on Render

For `EMAIL_PROVIDER=resend`, set these in **Render > Environment**:

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=SchemeSaathi <support@your-verified-domain.example>
RESEND_API_KEY=replace-with-resend-api-key
```

Replace the sender with an address on a domain you own and have verified in Resend. An ordinary `@gmail.com` sender will not work with this provider. The `onboarding@resend.dev` test sender is restricted to the Resend account's own email address, so it cannot support recovery for arbitrary public users. Check requests and delivery status in the Resend dashboard. [Resend test-sender restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [email API](https://resend.com/docs/api-reference/emails/send-email).

Do not purchase a domain or upgrade hosting without choosing that cost. If you have no verified domain and want to keep using Gmail, the existing Apps Script option below does not require a domain purchase.

## Gmail through Google Apps Script on Render Free

**Render Free blocks outbound SMTP ports 25, 465 and 587.** Changing a Gmail app password does not remove that restriction. The included Apps Script bridge uses HTTPS instead. [Render Free limitations](https://render.com/docs/free).

1. Sign in to [Google Apps Script](https://script.google.com/) with the Gmail account that will send the mail, such as `customercareprashasti@gmail.com`.
2. Create a project and copy the repository's [Code.gs](../scripts/google_apps_script/Code.gs) into its editor.
3. In **Project Settings > Script Properties**, add `BRIDGE_SECRET` with a privately generated random secret of at least 32 characters. Use the same value as `APPS_SCRIPT_SECRET` in Render. Keep it out of script source.
4. Choose **Deploy > New deployment > Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the sending account. The included signature and replay checks protect requests.
5. Copy the deployed web-app URL ending in `/exec`, then set these in Render:

```dotenv
EMAIL_PROVIDER=apps_script
EMAIL_FROM_ADDRESS=customercareprashasti@gmail.com
APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
APPS_SCRIPT_SECRET=replace-with-the-same-random-bridge-secret
```

`EMAIL_FROM_ADDRESS` must exactly match the account executing the script, without a display-name wrapper. Use your account's address if different. Save Render settings and wait for redeployment. After changing `Code.gs`, update the web-app deployment to a new version; saving the editor alone does not change an existing versioned deployment. [Google web-app deployment](https://developers.google.com/apps-script/guides/web).

Consumer Google accounts currently have an Apps Script allowance of 100 email recipients per day, shared with other scripts using that account. This is a small-prototype option with quotas, not unlimited delivery. Mismatched secrets or sender, restricted web-app access, missing authorization and exhausted quotas can prevent sending. [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## Gmail SMTP for local use

On your computer or a host that permits SMTP, enable Google's 2-Step Verification and create a [Google app password](https://support.google.com/accounts/answer/185833). Set these in the ignored `apps/backend/.env` and restart:

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=customercareprashasti@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=customercareprashasti@gmail.com
SMTP_PASSWORD=replace-with-google-app-password
SMTP_USE_SSL=false
```

Use the generated app password without its display spaces, not the normal Google password. Port 587 uses STARTTLS; port 465 needs `SMTP_USE_SSL=true`. Neither works on Render Free. Customer-care email and telephone links themselves need no provider password.

## Firebase mobile OTP

The current Render blueprint selects Firebase. Set its web-app configuration in **Render > Environment**:

```dotenv
SMS_PROVIDER=firebase
FIREBASE_API_KEY=replace-with-firebase-web-api-key
FIREBASE_PROJECT_ID=replace-with-firebase-project-id
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_APP_ID=replace-with-firebase-web-app-id
```

Copy all values from the same project's **Firebase > Project settings > Your apps > Web app**. The browser obtains this public configuration from the backend. A Firebase service-account private-key JSON does not belong in the frontend.

In **Firebase > Authentication**, enable **Phone** as a sign-in provider. Under **Settings**, add `schemesathi-ai-26kj.onrender.com` to **Authorized domains** and allow India in the SMS region policy. Use your deployed hostname if different, without `https://` or a path. Complete the browser reCAPTCHA when prompted. [Firebase phone setup](https://firebase.google.com/docs/auth/web/phone-auth).

**Actual Firebase verification SMS requires Blaze billing.** A project on Spark cannot be assumed to deliver real SMS. Firebase test phone numbers use console-configured codes and send no SMS; they are for controlled testing, not real recovery. To keep the prototype free, use working email verification and do not enable paid SMS without choosing that cost. [Firebase authentication limits](https://firebase.google.com/docs/auth/limits).

The app accepts a registered ten-digit Indian number; the backend sends it as `+91` plus that number. Missing configuration, disabled Phone sign-in, unauthorized domains, reCAPTCHA failures, region restrictions, billing requirements and rate limits can prevent delivery. Use sanitized Firebase failure reasons in Render logs and the Firebase dashboard to distinguish them. Configuring keys alone does not establish delivery.

## Optional MSG91 OTP and separate outreach

Recovery also supports `SMS_PROVIDER=msg91`. It requires `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` and `MSG91_OTP_TEMPLATE_ID`. The latter is an approved **SMS Flow ID** with an `otp` variable, not a DLT entity ID, OTP-widget ID or SendOTP-product template ID. The backend generates and verifies its own codes for this adapter. Required sender/DLT approvals and provider credit still apply. [MSG91 Flow API](https://api.msg91.com/apidoc/textsms/send-sms-flow.php).

Website-awareness messages use their own approved Flow, `MSG91_TEMPLATE_ID`, with the `website` variable, explicit recipient opt-in and the separate `SMS_LIVE_ENABLED` gate. Firebase verification does not send promotional messages. Do not switch providers or launch a campaign merely to troubleshoot a password-reset code.

## Verification and security behavior

- CAPTCHA is single-use and expires after five minutes. Recovery challenges expire after five minutes, allow five attempts and can be resent after sixty seconds with a fresh CAPTCHA.
- The API never returns OTPs. Application-generated codes and reset grants are stored as hashes/HMACs; Firebase sessions are encrypted server-side. Reset grants require successful verification, remain in browser memory and are single-use.
- Resetting a password invalidates earlier access/refresh sessions. Additive database upgrades preserve existing accounts; the registered contact must exist in the database used by the deployed service.
- Public recovery responses remain generic to protect account privacy. Background delivery errors do not log recipient addresses, credentials or codes. A successful HTTP response or provider acceptance does not prove receipt.
- Backend and browser tests use synthetic accounts and mocked delivery. They verify application behavior, not live delivery. Check a real registered account after completing provider setup.

From the repository root, inspect local configuration without showing values or sending messages:

```powershell
.venv/Scripts/python.exe scripts/check_providers.py
```

Use `--runtime-only` to inspect only the environment of the process running the command. Running it locally still does not inspect Render. Add `--check-smtp` for a permitted SMTP host to authenticate over TLS without sending mail. Do not test delivery to someone else's contact without permission.
