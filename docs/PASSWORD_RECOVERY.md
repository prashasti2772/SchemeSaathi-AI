# Password recovery and Gmail OTP setup

The forgot-password page offers **Reset via Email** and **Reset via Mobile Number**. Email OTPs use SMTP or the Resend HTTPS API; mobile OTPs use an MSG91 SMS Flow. Only the selected registered contact is eligible to receive the code. Unregistered and inactive contacts receive the same public response and never receive messages.

## Choose email delivery for your host

**Render Free blocks outbound SMTP ports 25, 465 and 587**, so Gmail SMTP will fail there even with a valid app password. Use the existing Resend HTTPS adapter for that deployment. [Render Free limitations](https://render.com/docs/free).

In **Render → Environment**, set:

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=SchemeSaathi <support@your-verified-domain.example>
RESEND_API_KEY=replace-with-resend-api-key
```

Replace the example sender with an address on a domain you own and have verified in Resend. The `resend.dev` test sender can send only to your Resend account's own email address; public-user recovery requires a verified domain. An ordinary Gmail address cannot be used as your verified Resend domain. Do not buy a domain or upgrade hosting unless you choose to do so. [Resend sender requirements](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [email API](https://resend.com/docs/api-reference/emails/send-email).

## Configure Gmail for local use or a host that permits SMTP

1. Enable 2-Step Verification on the Gmail account that will send SchemeSaathi emails.
2. Create a Google app password at https://myaccount.google.com/apppasswords. Use the label SchemeSaathi. Google instructions: https://support.google.com/accounts/answer/185833.
3. In `apps/backend/.env`, fill `EMAIL_FROM_ADDRESS` and `SMTP_USERNAME` with that Gmail address, and `SMTP_PASSWORD` with the generated app password (without display spaces). Do not use the normal Google account password or commit `.env`.

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM_ADDRESS=customercareprashasti@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=customercareprashasti@gmail.com
SMTP_PASSWORD=replace-with-google-app-password
SMTP_USE_SSL=false
```

4. Keep local credentials in the ignored `apps/backend/.env` and restart the backend after saving. On a host that permits SMTP, enter them in its private environment settings. Port 587 uses authenticated STARTTLS; port 465 can be used with `SMTP_USE_SSL=true`. Neither port works on Render Free. Never send app passwords in chat or put them in frontend environment variables.
5. On `/forgot-password`, choose **Reset via Email**, enter the registered email address, solve the CAPTCHA, then enter the six-digit code from the email. Check Spam if needed. After verification, set and confirm a password of 10 to 128 characters, and sign in again.

If the Google app-password option is absent, check Google's linked eligibility instructions. Some managed accounts cannot use app passwords. The customer-care email and telephone links need no Gmail password; these credentials are specifically for automated recovery email.

## Configure MSG91 mobile OTP

Configure `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` and `MSG91_OTP_TEMPLATE_ID` in the private local backend `.env`, or in **Render → Environment** for live hosting. `MSG91_OTP_TEMPLATE_ID` must identify an approved **SMS Flow** whose variable is named `otp`. The application generates and verifies its own codes; it does not use MSG91's separate OTP product. An empty **OTP Templates** screen is therefore not the SMS Flow setup page, and an OTP-product template ID will not work in this adapter.

Draft reset text: `Your SchemeSaathi password reset code is ##otp##. It expires in 5 minutes. Do not share this code.` Submit this for the provider's sender/DLT approval and map the approved text and `otp` variable to a Flow. This draft is not an approval. Enter the resulting **Flow ID**, not the DLT registration ID, as `MSG91_OTP_TEMPLATE_ID`.

Website outreach uses a separate Flow: `MSG91_TEMPLATE_ID`, with the `website` variable. Its draft is `Discover government schemes for your business with SchemeSaathi: ##website##`. Complete its own approval/mapping. The sender and Flow IDs stay on the backend.

```dotenv
MSG91_AUTH_KEY=replace-with-msg91-auth-key
MSG91_SENDER_ID=replace-with-approved-sender
MSG91_OTP_TEMPLATE_ID=replace-with-approved-otp-flow-id
```

The adapter posts to `https://api.msg91.com/api/v5/flow/` with the auth key in a header and the `otp` variable in the JSON recipient object. Registered Indian numbers are converted to the provider's `91` country-code format. See [MSG91 Flow API](https://api.msg91.com/apidoc/textsms/send-sms-flow.php) and [template requirements](https://msg91.com/help/dlt-registration-in-india/dlt-debugging-checklist).

Restart/redeploy after saving. Choose **Reset via Mobile Number**, enter the registered 10-digit Indian mobile number, solve the CAPTCHA, then verify the six-digit SMS code before setting a new password. OTP requests do not depend on `SMS_LIVE_ENABLED`, which controls outreach only. Provider credentials, an approved Flow and delivery credit/access are required for real SMS; acceptance alone does not confirm delivery.

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
