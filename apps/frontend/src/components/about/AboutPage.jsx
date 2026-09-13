import { MainLayout } from "../layout";
import { useLanguage } from "../../lib/i18n.jsx";

export default function AboutPage() {
  const { t } = useLanguage();
  const steps = [
    { key: "about_step_profile", label: t("about_step_profile") },
    { key: "about_step_business", label: t("about_step_business") },
    { key: "about_step_other", label: t("about_step_other") },
    { key: "about_step_matches", label: t("about_step_matches") },
  ];

  return (
    <MainLayout>
      <main className="bg-slate-50">
        <section className="bg-gradient-to-br from-[#0d2b55] via-[#153f7b] to-[#295aa9] px-5 py-16 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">{t("about_badge")}</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-5xl">
              {t("about_title_line1")} {t("about_title_line2")}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 md:text-lg">{t("about_intro")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-[#0d2b55]">{t("about_mission_title")}</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">{t("about_mission_text")}</p>
              <p className="mt-4 text-base leading-8 text-slate-600">{t("about_mission_secondary")}</p>
            </div>

            <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#0d2b55]">{t("about_info_title")}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t("about_info_1")}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t("about_info_2")}</p>
            </aside>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#0d2b55]">{t("about_how_it_works")}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d2b55] text-sm font-bold text-white">{index + 1}</div>
                  <h3 className="mt-4 text-lg font-semibold text-[#0d2b55]">{step.label}</h3>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <a className="inline-flex items-center rounded-xl bg-[#0d2b55] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#153f7b]" href="/find-schemes">
              {t("about_find_matches")}
            </a>
            <a className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#0d2b55] shadow-sm transition hover:border-slate-400" href="/categories">
              {t("nav_categories")}
            </a>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
