import { useLanguage } from "../lib/i18n.jsx";
import { MainLayout } from "./layout";

const SUPPORT_EMAIL = "customercareprashasti@gmail.com";

const GMAIL_COMPOSE =
  "https://mail.google.com/mail/?view=cm&fs=1" +
  "&to=" + encodeURIComponent(SUPPORT_EMAIL) +
  "&su=" + encodeURIComponent("SchemeSaathi Support Request") +
  "&body=" + encodeURIComponent(
    "Hello SchemeSaathi Support Team,\n\n" +
    "I need assistance with:\n\n" +
    "Affected page or scheme:\n" +
    "Issue:\n" +
    "Steps already tried:\n\n" +
    "Regards"
  );

export default function SupportPage() {
  const { t } = useLanguage();
  return (
    <MainLayout>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="rounded-3xl bg-gradient-to-r from-[#0d2b55] to-[#1c4d7f] p-8 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0c33c]">
            SchemeSaathi
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {t("Support & Assistance")}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Get help with account access, scheme discovery, documents or
            website-related issues.
          </p>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          <section className="flex min-h-[310px] flex-col justify-between rounded-3xl bg-gradient-to-br from-[#0d2b55] to-[#1c4d7f] p-7 text-white shadow-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6b629] text-[#0d2b55]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold">
                {t("Email Support")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-200">
                Contact our support team for account access, scheme discovery,
                document assistance or website-related issues.
              </p>

              <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <p className="break-all text-sm font-semibold">
                  {SUPPORT_EMAIL}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Never share passwords, OTPs, Aadhaar numbers or bank details.
              </p>
            </div>

            <a
              href={GMAIL_COMPOSE}
              className="mt-6 inline-flex w-fit items-center gap-2 font-semibold text-[#f3c735] hover:underline"
            >
              {t("Write an email →")}
            </a>
          </section>

          <a
            href="/ai-assistant"
            className="flex min-h-[310px] flex-col justify-between rounded-3xl bg-gradient-to-br from-[#0d2b55] to-[#1c4d7f] p-7 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6b629] text-[#0d2b55]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M8 10h8M8 14h5" />
                  <path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 3v-4a2 2 0 0 1-1-2V7a2 2 0 0 1 2-2Z" />
                </svg>
              </div>

              <h2 className="mt-5 text-xl font-bold">
                {t("AI Scheme Assistant")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-200">
                Ask scheme questions, use voice input, upload documents and
                listen to supported responses.
              </p>
            </div>

            <span className="mt-6 font-semibold text-[#f3c735]">
              {t("Open assistant →")}
            </span>
          </a>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0d2b55]">
            {t("Common questions")}
          </h2>

          <div className="mt-5 space-y-3">
            <details className="rounded-2xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold text-[#0d2b55]">
                Does a scheme match guarantee approval?
              </summary>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                A SchemeSaathi match helps identify relevant opportunities.
                Final eligibility and approval depend on the applicable
                scheme rules and application process.
              </p>
            </details>

            <details className="rounded-2xl border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold text-[#0d2b55]">
                Where do I apply?
              </summary>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Open the relevant scheme information and use the application
                channel provided for that scheme.
              </p>
            </details>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
