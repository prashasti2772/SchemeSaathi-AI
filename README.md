# SchemeSaathi AI — SIH26092

A working citizen prototype for **AI-Driven Scheme Matching for Marginalized Entrepreneurs**, based on the problem title and MoSJE context supplied by the team. This is a student project, not an official government service.

## What works

- React profile wizard and scheme results, backed by FastAPI.
- 653 catalogue records from the team's supplied CSV; explanations, benefits, document lists and official links.
- Screening for age, income, gender, social category, disability, rural residence, business and state. SC and ST remain distinct.
- State/district dropdowns from an offline NIC iGOD snapshot, refreshed 9 September 2026. A changed state clears the district; the server validates the pair.
- Real citizen signup/login, hashed passwords, access tokens, SQLite persistence and staff authorization.
- Chatbot with local keyword/TF-IDF retrieval and source-based answers. Gemini generation is optional.
- Voice page with browser English speech and a Bhashini ASR → translation → scheme assistant → translation → TTS integration.
- Customer care: private support tickets, staff replies, email and telephone links.
- Explicit SMS opt-in/opt-out, staff campaign preview, and a disabled-by-default MSG91 adapter.
- Production frontend build served by FastAPI, Docker image, persistent storage configuration and GitHub CI.

**Screening is preliminary.** The supplied eligibility table does not encode every scheme condition or confirm current availability. State is inferred from catalogue text for state schemes; ambiguous jurisdictions are excluded. A score measures recorded criteria, not approval probability. Read the official scheme guidelines before applying. The app does not file applications or approve benefits.

## Start locally on Windows

Install Python 3.13 and Node.js 24. Open PowerShell in this repository.

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r apps/backend/requirements.txt
npm.cmd --prefix apps/frontend ci
Copy-Item apps/backend/.env.example apps/backend/.env
```

Set a random JWT secret in `apps/backend/.env` (do not commit it). Generate one locally:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Terminal 1:

```powershell
cd apps/backend
../../.venv/Scripts/python.exe -m uvicorn src.main:app --host 127.0.0.1 --port 8000
```

Terminal 2, from the repository root:

```powershell
npm.cmd --prefix apps/frontend run dev
```

Open **http://localhost:5173**. The Vite proxy connects to port 8000.
Backend health: http://127.0.0.1:8000/health
Development API docs: http://127.0.0.1:8000/api/docs

To test the production frontend locally:

```powershell
npm.cmd --prefix apps/frontend run build
```

Start/restart the backend after the build, then open **http://127.0.0.1:8000**. Direct navigation to the profile, results, chat and support pages works.

On Linux/macOS use `.venv/bin/python`, `npm`, and `cp` in place of the corresponding Windows commands.

## Storage and accounts

The default database is `apps/backend/schemesathi.db` when the backend starts from its directory. Accounts, support tickets and SMS consent persist across restarts. Do not remove this file to reset a public service.

Wizard answers remain scoped to the current account in the browser. They are not a synchronized cloud profile. Access tokens are stored for the browser tab and expire after 30 minutes; sign in again when requested. Registration does not verify mobile/email ownership. Do not use this prototype as identity verification.

Create a staff account after starting the backend once:

```powershell
cd apps/backend
../../.venv/Scripts/python.exe ../../scripts/create_staff.py
```

Enter the email, name and password in the terminal. Sign in with that account and open **Support** to view the helpdesk queue and outreach preview. Public registration always creates a citizen. No default admin password is shipped.

The inherited staff/telephony/OCR/outreach scaffolding is disabled by default via `ENABLE_STAFF_API=false`. The citizen helpdesk works independently. Keep that setting false for this prototype; enabling legacy routes requires separate review and infrastructure setup.

## Customer care

- Email: [srivastava2722@gmail.com](mailto:srivastava2722@gmail.com)
- Phone: [+91 96530 31393](tel:+919653031393)
- Website: **Help & support** → open a ticket and track the team's response.

Email and telephone links open the user's email/dialler. The application does not automatically send support emails and does not promise 24/7 staffing.

## Bhashini voice setup

In the backend environment, configure:

```dotenv
BHASHINI_USER_ID=your-issued-user-id
BHASHINI_API_KEY=your-issued-api-key
BHASHINI_PIPELINE_ID=your-authorized-pipeline-id
```

Restart the backend. Open **Voice assistant**, choose **Bhashini**, select a language, record a question and stop. The browser creates mono 16-bit PCM WAV at 16 kHz. Recording is capped below 45 seconds. Microphone use requires HTTPS or localhost and permission.

The backend discovers task service IDs and the inference endpoint from the pipeline configuration. Language/model access depends on your provider account. Missing credentials or provider failures return an error, never a fake transcript or audio. Browser mode remains available in supporting browsers and uses English answers.

Live Bhashini calls have **not** been verified without the team's credentials. See [Bhashini pipeline documentation](https://bhashini.gitbook.io/bhashini-apis/pipeline-compute-call).

## SMS awareness setup

1. Obtain an MSG91 account and configure the sender and approved Indian SMS/DLT template with a `website` variable.
2. Configure the backend:

```dotenv
PUBLIC_SITE_URL=https://your-live-site.example
MSG91_AUTH_KEY=your-provider-key
MSG91_TEMPLATE_ID=your-flow-template-id
MSG91_SENDER_ID=your-approved-sender
SMS_LIVE_ENABLED=false
```

3. Users sign in and choose **Support → Opt in to SMS**. They can opt out at any time.
4. Staff preview the campaign. Set `SMS_LIVE_ENABLED=true` only when ready to use the paid provider and approved template, then restart.
5. Staff click **Send approved campaign**. A request contains at most 100 eligible recipients. Provider acceptance is not delivery confirmation. Batches are reserved before sending to avoid duplicates; an uncertain provider result requires manual provider-log review, not an automatic retry.

No SMS was sent during development. The contact phone supplied by the team is customer care, not an automatically subscribed recipient. For a public rollout, add phone verification, delivery webhooks, campaign/audit records, operational retries and provider-compliant unsubscribe handling. Never upload an unsolicited contact list.

See [MSG91 Flow API](https://api.msg91.com/apidoc/textsms/send-sms-flow.php).

## Optional Gemini

Set `GEMINI_API_KEY` and a model available to your account in `CHATBOT_MODEL`. The API key stays on the backend. Without it, chat uses local catalogue retrieval. Answers may be incomplete; verify official sources.

## Tests

```powershell
.venv/Scripts/python.exe -m pip install pytest
$env:PYTHONPATH='apps/backend'
.venv/Scripts/python.exe -m pytest apps/backend/tests -q
npm.cmd --prefix apps/frontend run lint
npm.cmd --prefix apps/frontend run build
```

For the browser test, build the frontend and run the backend on port 8000, then:

```powershell
cd apps/frontend
npx.cmd playwright test
```

On Windows the test uses an isolated headless Microsoft Edge instance. On Linux install Playwright Chromium with `npx playwright install --with-deps chromium`. Tests create synthetic accounts and support tickets; use a test database for repeated browser runs.

## Publish and host

GitHub stores the project and CI workflow. **GitHub Pages cannot run this Python backend**, so publishing the repository alone is not a full-stack live deployment. See [GitHub Pages documentation](https://docs.github.com/en/pages).

Docker:

```powershell
$env:JWT_SECRET_KEY='your-generated-random-secret'
docker compose up --build
```

Open http://localhost:8000. The named volume preserves SQLite data. The Docker image refuses the default/short JWT secret in production.

For **free hosting**, follow [FREE_HOSTING.md](docs/FREE_HOSTING.md). The included Render blueprint uses a **Free** web service and a separate free Neon PostgreSQL database. It creates no paid disk or paid service. You need to sign up/sign in to those services yourself. The database connection string belongs in Render's secret environment settings.

Free hosting may sleep after inactivity and has usage limits. A live internet URL is available only after you complete that deployment. Keep SQLite for local use or Docker Compose with its local volume; do not use ephemeral SQLite for durable online accounts/tickets.

## Data and review

- [Project review](docs/REVIEW.md)
- Location source: [NIC Integrated Government Online Directory](https://igod.gov.in/sg/district/states)
- Refresh location snapshot: `python scripts/refresh_locations.py` (network required; checks all state counts before replacing files).
- The supplied scheme CSV, eligibility rules, notebooks and model assets are retained from the team's archive. Their full provenance, reuse rights, freshness and accuracy require team verification before a public launch.
- No Git history was included in the ZIP. Preserve the original group attribution when publishing or linking the original team repository.

Do not commit `.env`, databases, provider keys, user records or test screenshots containing personal information.

