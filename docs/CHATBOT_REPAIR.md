# Chatbot repair - 12 September 2026

## Reported problem

"tell me what is subsidy" returned several scheme listings. Selecting Hindi caused a Bhashini configuration error. The frontend language choice and chat preference could diverge, and an old backend process continued to serve previous logic after source files changed.

## Behavior now

- Explanations, examples, repayments, greetings, clarifications, specific scheme questions and discovery requests follow distinct paths. General definitions never attach scheme cards.
- Eight authored language packs cover English, Hindi, Marathi, Gujarati, Tamil, Telugu, Bengali and Kannada. They explain subsidy, loan, grant, interest, collateral, EMI, margin money and annual family income. They are a bounded local guide, not a general-purpose language model.
- English questions can receive answers in the chosen Indian language. Native-script input and common Hindi transliteration are recognized; explicit requests such as "in Hindi" can change the reply language while preserving context.
- Named scheme questions select the requested catalogue fields. An unclear request asks for clarification rather than returning unrelated schemes. Catalogue information retains its existing accuracy limitations.
- A configured Gemini model answers open-ended questions directly in the chosen language. Text chat does not require Bhashini when Gemini is available. Bhashini remains an optional translation fallback for detailed scheme answers.
- When neither provider can translate a detailed catalogue answer, the bot gives an honest localized limitation and official links. It does not claim an English dump is a translated answer.
- One language preference drives both website and chatbot labels. Localized suggestions and greetings follow it. New chat cancels pending replies. Failed requests can be retried without duplicating user messages or adding errors to conversation history. Only the conversation panel auto-scrolls.

## Configure the optional model

In `apps/backend/.env`, set `GEMINI_API_KEY` and, if necessary, `CHATBOT_MODEL` to a model your account can use. Restart the backend after changing the environment. No API key belongs in frontend code or Git. The optional provider uses the official Google GenAI async client, a separate system instruction, bounded history, a 35-second generation timeout and local fallback on provider failure.

Official API reference: https://ai.google.dev/api/generate-content

## Verification

Backend tests cover the exact reported question, native language answers, English-to-Hindi reply selection, transliterated Hindi, follow-up context, topic changes, examples, repayment, document-only answers, API validation, legacy endpoint consistency and provider failure. Browser tests exercise real local responses in all eight languages, mobile layout, history reset, cancellation and retry isolation. Native-language wording has not been independently reviewed by professional translators. Live model behavior requires the user's working Gemini credential and is verified separately from mocked provider tests.

The scope of this update is the text chatbot. Scheme data, SMS, hosting and the voice page were not changed.

## Provider configuration follow-up

The default model is now `gemini-3.6-flash`; Google returned a model-unavailable error for the previous default on the supplied account. The key is stored only in the ignored backend `.env`. Direct provider and generated chatbot responses succeeded, but later provider calls also timed out. A 35-second bound and authored local-language fallback keep the assistant usable; these checks do not establish continuous provider availability. Gemini 3.6 Flash uses minimal thinking for short conversational answers. See [Google generation settings](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
