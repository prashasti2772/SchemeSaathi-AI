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

## MSG91

Create an approved Flow/DLT template whose website variable is named `website`. Set `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (the Flow ID), `MSG91_SENDER_ID`, and `PUBLIC_SITE_URL`. Keep `SMS_LIVE_ENABLED=false` until the configuration is ready. Users subscribe in Support; staff preview a campaign before sending. Provider acceptance is distinct from delivered SMS. This application does not send messages to uploaded unsolicited numbers or treat the team's support number as a subscriber.

## Optional Netlify frontend

Use base directory `apps/frontend`, build command `npm run build`, publish directory `dist`. Set `VITE_API_BASE_URL` to the Render backend address plus `/api/v1` and allow the Netlify origin in backend `CORS_ORIGINS`. Add a SPA fallback `/* /index.html 200`. Hosting everything on Render avoids this extra cross-origin setup.
