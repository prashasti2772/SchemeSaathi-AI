# Complete provider setup

## Bhashini

1. Sign into the Bhashini account used to generate the Udyat API key.
2. Open **My Profile** or **App Integration Details** and copy the **User ID**. It is separate from the API key and inference key.
3. In `apps/backend/.env` locally, or the Render service's Environment settings, set `BHASHINI_USER_ID`, `BHASHINI_API_KEY` and the account-authorized `BHASHINI_PIPELINE_ID`.
4. Restart the backend. The Voice assistant status reports configuration, not successful authentication.
5. Test an English-to-Hindi question, then a Hindi question, then microphone input. A 401 from Bhashini requires checking the account's key and model access, not changing the browser code.

The provided inference credential alone was rejected by the documented endpoint. The application discovers its inference credential from the authorized pipeline configuration. Do not commit `.env` or put any Bhashini key in a Vite variable. Official setup: https://dibd-bhashini.gitbook.io/bhashini-apis/pipeline-config-call

## Render

Use the existing `render.yaml` blueprint and GitHub repository `prashasti2772/SchemeSaathi-AI`. The Docker build serves frontend and API from one origin. Set a persistent PostgreSQL connection string as `DATABASE_URL` and the assigned HTTPS Render address as `PUBLIC_SITE_URL`. The blueprint generates `JWT_SECRET_KEY`.

Provide access by connecting the hosting account or placing a Render API token in a local ignored `.env.deploy` file as `RENDER_API_KEY`. Do not send an account password or OTP. If the service already exists, provide its service ID or dashboard URL. A live link must be verified after deployment finishes.

For recovery email on **Render Free**, use the existing HTTPS email adapter: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM_ADDRESS` on a domain you own and have verified in Resend. Gmail SMTP cannot work on this plan because [Render blocks outbound ports 25, 465 and 587](https://render.com/docs/free). The [Resend test domain only sends to the account owner's email](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain); it is not suitable for password recovery for other users. Domain ownership and verification are separate from free website hosting.

## MSG91

The current adapter uses **SMS Flow**, including for password-reset codes. An empty **OTP Templates** screen belongs to the separate MSG91 OTP product; it does not show whether SMS Flow templates exist. An OTP-product template ID cannot be substituted for the Flow IDs below. Open the SMS product and its template/Flow setup. See the separate [SMS Flow API](https://api.msg91.com/apidoc/textsms/send-sms-flow.php) and [OTP API](https://docs.msg91.com/otp).

| Purpose | Backend settings | Flow variable |
|---|---|---|
| Password-reset SMS | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_OTP_TEMPLATE_ID` | `otp` |
| Website outreach SMS | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID`, `PUBLIC_SITE_URL` | `website` |

Draft messages to submit for provider approval:

- Reset: `Your SchemeSaathi password reset code is ##otp##. It expires in 5 minutes. Do not share this code.`
- Outreach: `Discover government schemes for your business with SchemeSaathi: ##website##`

These drafts are not approved templates. Complete MSG91's sender/DLT approval and mapping for each message, and retain the exact variable names in its Flow. `MSG91_OTP_TEMPLATE_ID` and `MSG91_TEMPLATE_ID` take the respective **Flow IDs**, not the DLT registration IDs. Confirm the approved text and account delivery access with the provider before using them. See [MSG91 template requirements](https://msg91.com/help/dlt-registration-in-india/dlt-debugging-checklist).

Enter the values privately in `apps/backend/.env` for local use and in **Render → Environment** for the deployed service, then restart/redeploy. Never send API keys or app passwords in chat. Keep `SMS_LIVE_ENABLED=false` until an outreach campaign is ready. Password-reset SMS is independent of that outreach switch; setting valid OTP credentials enables recovery delivery.

Users subscribe in Support; staff preview a campaign before sending. Provider acceptance is distinct from delivered SMS, and real delivery may require provider credit. This application does not send messages to uploaded unsolicited numbers or treat the team's support number as a subscriber. Recovery details: [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md).

## Optional Netlify frontend

Use base directory `apps/frontend`, build command `npm run build`, publish directory `dist`. Set `VITE_API_BASE_URL` to the Render backend address plus `/api/v1` and allow the Netlify origin in backend `CORS_ORIGINS`. Add a SPA fallback `/* /index.html 200`. Hosting everything on Render avoids this extra cross-origin setup.
