# Password recovery and Gmail OTP setup

The forgot-password page offers **Reset via Email** and **Reset via Mobile Number**. Email OTPs use Gmail SMTP; mobile OTPs use the existing MSG91 connection. Only the selected registered contact receives the code. Unregistered and inactive contacts receive the same public response and never receive messages.

## Configure Gmail

1. Enable 2-Step Verification on the Gmail account that will send SchemeSaathi emails.
2. Create a Google app password at https://myaccount.google.com/apppasswords. Use the label SchemeSaathi. Google instructions: https://support.google.com/accounts/answer/185833.
3. In `apps/backend/.env`, fill `EMAIL_FROM_ADDRESS` and `SMTP_USERNAME` with that Gmail address, and `SMTP_PASSWORD` with the generated app password (without display spaces). Do not use the normal Google account password or commit `.env`.

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=your-sender@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-sender@gmail.com
SMTP_PASSWORD=replace-with-google-app-password
SMTP_USE_SSL=false
```

4. Keep credentials only in `apps/backend/.env` and restart the backend after saving. Port 587 uses authenticated STARTTLS; port 465 can be used with `SMTP_USE_SSL=true` if your host permits outbound SMTP.
5. On `/forgot-password`, choose **Reset via Email**, enter the registered email address, solve the CAPTCHA, then enter the six-digit code from the email. Check Spam if needed. After verification, set and confirm a password of 10 to 128 characters, and sign in again.

If the Google app-password option is absent, check Google's linked eligibility instructions. Some managed accounts cannot use app passwords. The app also supports Resend: set `EMAIL_PROVIDER=resend`, a verified `EMAIL_FROM_ADDRESS`, and `RESEND_API_KEY`. Its API contract is documented at https://resend.com/docs/api-reference/emails/send-email.

## Configure MSG91 mobile OTP

Keep the existing `MSG91_AUTH_KEY` and `MSG91_SENDER_ID` in `apps/backend/.env`. Add `MSG91_OTP_TEMPLATE_ID` for an approved SMS Flow template whose text contains the variable `##otp##` and states that the code expires in five minutes. This is a separate template from website outreach (`MSG91_TEMPLATE_ID`). Use an approved sender in your MSG91 account. The sender ID and flow ID are taken from the backend environment; no provider credentials are sent to the browser.

```dotenv
MSG91_AUTH_KEY=replace-with-msg91-auth-key
MSG91_SENDER_ID=replace-with-approved-sender
MSG91_OTP_TEMPLATE_ID=replace-with-approved-otp-flow-id
```

The adapter posts to `https://api.msg91.com/api/v5/flow/` with the auth key in a header and the `otp` variable in the JSON recipient object. Registered Indian numbers are converted to the provider's `91` country-code format. See [MSG91 Flow API](https://api.msg91.com/apidoc/textsms/send-sms-flow.php) and [template requirements](https://msg91.com/help/dlt-registration-in-india/dlt-debugging-checklist).

Choose **Reset via Mobile Number**, enter the registered 10-digit Indian mobile number, solve the CAPTCHA, then verify the six-digit SMS code before setting a new password. OTP requests do not depend on the separate outreach opt-in switch.

## Behavior and verification

- Startup upgrades older account tables without deleting account records. This fixes the generic errors caused by missing reset fields.
- Signup uses a server-checked CAPTCHA. A duplicate email or mobile shows an already-registered message with sign-in/reset links.
- Recovery CAPTCHA is single-use and expires after five minutes. OTPs expire after five minutes, allow five guesses, and can be resent after sixty seconds with a fresh CAPTCHA.
- OTPs and reset grants are stored as hashes/HMACs. The API never returns an OTP. A reset grant is issued only after successful OTP verification, stays in browser memory, and can be used once.
- Resetting a password invalidates earlier access and refresh sessions.
- An unconfigured contact method returns the same unavailable response for every contact. With a configured method, delivery happens after the public response; provider acceptance, errors, and timing do not reveal whether an account exists. Failed delivery is logged without contacts, credentials or codes. The page does not claim confirmed delivery. Resend is available after sixty seconds with a fresh CAPTCHA.
- Local backend and browser tests complete both flows with synthetic accounts and mocked Gmail/MSG91 delivery. Provider adapter tests check SMTP TLS/authentication, MSG91 template/recipient payload, rejection and missing credentials. Receiving real emails/SMS requires the corresponding configuration above.

## Local verification result

77 backend regression tests passed, including both OTP delivery paths, contact validation, expiry, replay rejection, concurrent attempt/reset handling, session revocation, and older database upgrades. Fifteen browser tests passed, including complete email and mobile recovery journeys followed by sign-in. Lint and production build passed. Tests used mocked provider delivery and a temporary database. The running local website was separately checked for CAPTCHA loading, duplicate-account feedback and responsive recovery forms.
