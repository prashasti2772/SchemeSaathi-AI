# Project repair review — 9 September 2026

## Scope

Reviewed the archive's React screens, frontend/backend API contracts, FastAPI startup and configuration, authentication, catalogue and eligibility engine, voice/provider clients, support/outreach paths, tests and deployment setup. The SIH alignment uses the user-supplied SIH26092 title and MoSJE description; the full official evaluation brief was not supplied or independently verified. Research notebooks and optional trained binaries were inventoried, not retrained or independently benchmarked.

## Findings and repairs

| Area | Original finding | Repair |
|---|---|---|
| Signup | Component had broken/commented-out structure | Replaced with working API-backed account form |
| Login | Demo flow accepted invalid passwords and used browser-only account state | Persistent citizen accounts, password hashing, signed tokens and server authorization |
| Database | Default required external PostgreSQL; no ready local initialization | SQLite default, portable JSON columns, automatic initial schema creation |
| Catalogue/chat | Mixed CSV encoding, pickle dependency and optional missing ML/provider packages | Normalized CSV encoding; runtime reads CSV; local retrieval works without a paid model |
| Catalogue identity | Aggressive name normalization merged two different youth-enterprise schemes | Preserve meaningful name spacing and use supplied slugs for IDs |
| Scheme results | Public API swallowed failures into successful empty responses | Validation errors are distinct from valid empty results |
| Matching gender/category | Female substring included male; SC/ST conflated; commas lost from category lists | Exact gender tokens, separate SC and ST, preserved list separators |
| Matching numbers/booleans | Decimal income rules and string booleans interpreted incorrectly | Correct decimal parsing and explicit boolean normalization |
| State eligibility | Source rule table had no state column | Infer a single state from catalogue text, exclude uncertain jurisdiction, apply state check |
| State/district UI | Short, stale district lists; arbitrary city text accepted as district | Offline NIC directory snapshot, state reset and server validation |
| Scores/explanations | Scorer used Location while matcher emitted other names; disability failures hidden | Consistent state/rural checks; visible conditions and preliminary-screening notice |
| Voice | Hardcoded profile demo; disconnected Bhashini integration; fallback could hide failure | Working voice page, WAV recording, Bhashini pipeline route and explicit unavailable state |
| Customer care | No operational citizen helpdesk | Persistent private tickets, staff response queue, supplied email/telephone links |
| Outreach | No usable citizen opt-in and staff preview journey | Consent storage, opt-out, staff preview and credential-gated MSG91 send adapter |
| Deployment/docs | Root README contained only a heading; no full-stack packaging | README, environment examples, Docker/Compose, Render blueprint, CI and regression tests |
| Quality checks | ESLint only targeted TypeScript while app is JSX | Added actual JavaScript/JSX lint coverage |

## What is implemented versus what needs external setup

Citizen registration/login, wizard screening, catalogue retrieval, local chatbot answers, support tickets and SMS consent are runnable locally. Browser voice depends on browser support. Bhashini and MSG91 integration code is present, but real ASR/NMT/TTS and SMS delivery require the team's provider accounts and have not been validated live. Email/phone contact links are configured; no email delivery service or staffed call centre is created.

Legacy applications, beneficiary administration, telephony, OCR, analytics and other staff scaffolding remain in the repository for the team. Their API registration is opt-in and their operational flows were not certified by the citizen prototype tests. This work does not establish a production-ready government system.

## Accuracy and rollout limitations

The 653-row source catalogue and derived rule table are not an authoritative current registry. Missing scheme conditions are not proof of eligibility. Clearly sector-specific scheme titles are also screened against the business activity; this is a heuristic rather than a complete eligibility rule. State inference is a conservative heuristic and cannot replace an explicit reviewed jurisdiction field. Income ranges are screened conservatively; detailed per-scheme rules, business stage, loan history, residence duration and document requirements can still affect the actual decision. Test failures must never be converted into claims of no eligible schemes.

Scores are criterion coverage, not a calibrated AI confidence or approval probability. No precision/recall benchmark against expert-labelled cases was performed. Before an SIH final demo, prepare realistic SC, ST, OBC, women, disability and rural/urban examples and compare the suggested schemes against the current official guidelines.

Public rollout still needs verified phone ownership, account recovery/email verification, synchronized profiles if required, formal scheme-data curation, database migrations/backups, stronger operational audit logging, provider delivery receipts and load testing. Staff creation is a local administrative command. Keep legacy staff APIs disabled unless explicitly integrated and reviewed.

## Verification

Nine focused backend regression tests passed for health/catalogue, real authentication, staff access restrictions, ticket isolation, consent withdrawal, parser regressions, valid results/state filtering, invalid district rejection, local chat and unconfigured Bhashini, and duplicate-send protection with a mocked SMS provider.

The React production build succeeds. JavaScript/JSX lint runs against the actual app. The end-to-end browser test exercises signup, state reset, the full wizard, results, chat, voice status and support, including a mobile viewport; the complete browser test passed.

No real SMS, emails or Bhashini provider calls were sent. Docker/Render Free + Neon configuration is supplied; hosted deployment must be verified after a hosting account is connected.

