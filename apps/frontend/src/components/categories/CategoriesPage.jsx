import { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import { apiError, fetchCatalogSchemes } from "../../lib/api";
import { useLanguage } from "../../lib/i18n.jsx";
import { officialSchemeUrl } from "../../lib/citizenProfile";
import SaveSchemeButton from "../schemes/SaveSchemeButton";

const baseCategories = [
  { id: 10, nameKey: "Entrepreneurship", queryKey: "Entrepreneurship", icon: "\u{1F3EA}", descriptionKey: "Support for starting or growing a business, including credit and subsidies.", tags: ["Entrepreneurship", "Business", "Subsidies"] },
  { id: 7, nameKey: "Skill Development", queryKey: "Skill Development", icon: "\u{1F6E0}", descriptionKey: "Training and practical skills for work and enterprise.", tags: ["Skills", "Training", "Enterprise"] },
  { id: 11, nameKey: "Artisan support", queryKey: "Artisan Support", icon: "\u{1F9F5}", descriptionKey: "Skills, tools and support for traditional crafts and trades.", tags: ["Artisans", "Tools", "Training"] },
  { id: 12, nameKey: "Marketing and technology", queryKey: "Marketing & Technology", icon: "\u{1F4BB}", descriptionKey: "Support for market access, enterprise development and technology.", tags: ["Marketing", "Technology", "Business"] },
  { id: 6, nameKey: "Employment", queryKey: "Employment", icon: "\u{1F4BC}", descriptionKey: "Employment and livelihood opportunities.", tags: ["Employment", "Livelihood", "Workers"] },
  { id: 1, nameKey: "Education", queryKey: "Education", icon: "\u{1F393}", descriptionKey: "Scholarships and support for learning.", tags: ["Education", "Scholarships", "Students"] },
  { id: 2, nameKey: "Healthcare", queryKey: "Healthcare", icon: "\u{1F3E5}", descriptionKey: "Health coverage and medical assistance.", tags: ["Health", "Insurance", "Treatment"] },
  { id: 3, nameKey: "Agriculture", queryKey: "Agriculture", icon: "\u{1F33E}", descriptionKey: "Support for farmers and agricultural households.", tags: ["Agriculture", "Farmers", "Rural"] },
  { id: 4, nameKey: "Pensions", queryKey: "Pensions", icon: "\u{1F91D}", descriptionKey: "Social security and support in later life.", tags: ["Pension", "Social Security", "Older people"] },
  { id: 5, nameKey: "Housing", queryKey: "Housing", icon: "\u{1F3E0}", descriptionKey: "Assistance for a safe place to live.", tags: ["Housing", "Rural", "Urban"] },
  { id: 8, nameKey: "Women and family support", queryKey: "Women", icon: "\u{1F469}", descriptionKey: "Support for women, mothers and families.", tags: ["Women", "Maternity", "Family"] },
  { id: 9, nameKey: "Disability support", queryKey: "Disability Support", icon: "\u267F", descriptionKey: "Assistance and inclusion for people with disabilities.", tags: ["Disability", "Accessibility", "Inclusion"] },
];


export default function CategoriesPage() {
  const { t } = useLanguage();
  const initial = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(initial.get("q") || "");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ schemes: [], total: 0, has_more: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const hasFilter = Boolean(query.trim()) || Boolean(category) || window.location.pathname === "/search";

  useEffect(() => {
    if (!hasFilter) {
      setResult({ schemes: [], total: 0, has_more: false });
      setBusy(false);
      setError("");
      return undefined;
    }

    let active = true;
    setBusy(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const data = await fetchCatalogSchemes(query.trim(), 12, page * 12, category);
        if (active) setResult(data);
      } catch (e) {
        if (active) setError(apiError(e));
      } finally {
        if (active) setBusy(false);
      }
    }, 250);

    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, page, retry, hasFilter]);

  function reset() {
    setQuery("");
    setCategory("");
    setPage(0);
    setExpanded(null);
  }

  const selectedCategory = baseCategories.find((item) => item.queryKey === category);

  return (
    <MainLayout>
      <main className="mx-auto min-w-0 max-w-7xl break-words px-5 py-8 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[28px] border border-[#f4d780]/60 bg-[radial-gradient(circle_at_top_left,_rgba(216,170,45,0.18),_transparent_30%),linear-gradient(135deg,_#081d3d_0%,_#0d2b55_46%,_#143d73_100%)] p-6 shadow-[0_22px_50px_rgba(8,29,61,0.18)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f4d780]">{t("categories_page_badge")}</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{t("categories_page_title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">{t("entrepreneur_categories_note")}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur-sm">
              {t("categories_count", { count: baseCategories.length })}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] md:p-6">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="scheme-search">{t("categories_search_label")}</label>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              id="scheme-search"
              type="search"
              maxLength={150}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
                setExpanded(null);
              }}
              placeholder={t("categories_search_placeholder")}
              className="min-w-0 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-[#0d2b55] focus:bg-white focus:ring-4 focus:ring-[#d8aa2d]/20"
            />
            {hasFilter && (
              <button
                type="button"
                onClick={reset}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                {t("categories_clear")}
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2" aria-label={t("Scheme categories")}>
            <button
              aria-pressed={!category}
              onClick={() => {
                setCategory("");
                setPage(0);
                setExpanded(null);
              }}
              className={`max-w-full whitespace-normal rounded-full border px-4 py-2 text-sm font-medium transition ${
                !category
                  ? "border-[#0d2b55] bg-[#0d2b55] text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {t("categories_all")}
            </button>
            {baseCategories.map((c) => (
              <button
                key={c.id}
                aria-pressed={category === c.queryKey}
                onClick={() => {
                  setCategory(category === c.queryKey ? "" : c.queryKey);
                  setPage(0);
                  setExpanded(null);
                }}
                className={`max-w-full whitespace-normal rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c.queryKey
                    ? "border-[#0d2b55] bg-[#0d2b55] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {t(c.nameKey)}
              </button>
            ))}
          </div>
        </div>

        {!hasFilter && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 md:flex-nowrap">
              <h2 className="text-2xl font-bold text-[#0d2b55]">{t("categories_browse")}</h2>
              <span className="text-sm text-slate-500">{t("categories_count", { count: baseCategories.length })}</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {baseCategories.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full min-w-0 flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#f4d780] hover:shadow-[0_18px_32px_rgba(216,170,45,0.14)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7dc] text-2xl shadow-inner shadow-[#f4d780]/30">
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-[#0d2b55]">{t(item.nameKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(item.descriptionKey)}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="max-w-full whitespace-normal rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-600"
                      >
                        {t(tag)}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory(item.queryKey);
                      setPage(0);
                      setExpanded(null);
                    }}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#0d2b55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173b70]"
                  >
                    {t("categories_explore", { category: t(item.nameKey) })}
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {hasFilter && (
          <>
            <div aria-live="polite" className="my-6 text-sm text-slate-600">
              {busy ? (
                t("categories_searching")
              ) : error ? (
                <p role="alert" className="text-red-700">
                  {error}{" "}
                  <button className="underline" onClick={() => setRetry((n) => n + 1)}>
                    {t("categories_retry")}
                  </button>
                </p>
              ) : (
                `${result.total} ${t("categories_found")}`
              )}
            </div>

            {selectedCategory && !busy && !error && (
              <div className="mb-6 rounded-2xl border border-[#f4d780] bg-[#fffaf0] p-4 text-sm text-[#5f4910]">
                {t("categories_showing", { category: t(selectedCategory.nameKey) })}
              </div>
            )}

            {!busy && !error && result.schemes.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#0d2b55]">{t("categories_no_match")}</h2>
                <p className="my-3 text-slate-600">{t("categories_no_match_hint")}</p>
                <button className="text-sm font-semibold underline text-[#0d2b55]" onClick={reset}>
                  {t("categories_clear")}
                </button>
              </div>
            )}

            {!busy && !error && (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {result.schemes.map((s, i) => (
                  <article key={s.scheme_name} className="flex min-w-0 flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {s.level || t("categories_record")}
                    </p>
                    <h2 className="my-2 text-lg font-bold text-[#0d2b55]">{s.scheme_name}</h2>
                    <p className="line-clamp-4 text-sm leading-7 text-slate-600">{s.description}</p>
                    <button
                      aria-expanded={expanded === i}
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      className="my-4 text-left text-sm font-semibold underline text-[#0d2b55]"
                    >
                      {expanded === i ? t("categories_hide_details") : t("categories_show_details")}
                    </button>
                    {expanded === i && (
                      <dl className="mb-4 space-y-3 text-sm leading-7 text-slate-700">
                        {[ [t("categories_benefits"), "benefits"], [t("categories_eligibility"), "eligibility"], [t("categories_documents"), "documents"], [t("categories_how_to_apply"), "application_process"] ].map(([label, key]) => (
                          <div key={key}>
                            <dt className="font-bold text-[#0d2b55]">{label}</dt>
                            <dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s[key] || t("categories_not_recorded")}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <SaveSchemeButton scheme={s} />
                    {s.verified_on && <p className="my-3 text-xs text-slate-500">{t("Source checked")}: {s.verified_on}</p>}
                    <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-200 pt-4 text-sm">
                      {officialSchemeUrl(s.official_url) && (
                        <a href={officialSchemeUrl(s.official_url)} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#0d2b55]">
                          {t("categories_official_guidance")}
                        </a>
                      )}
                      {officialSchemeUrl(s.application_url) && <a href={officialSchemeUrl(s.application_url)} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#0d2b55]">{t("Official application guidance")}</a>}
                      <a href={"/ai-assistant?q=" + encodeURIComponent("Tell me about " + s.scheme_name)} className="font-semibold underline text-[#0d2b55]">
                        {t("categories_ask_assistant")}
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!busy && !error && result.total > 12 && (
              <nav aria-label={t("Search result pages")} className="my-8 flex flex-wrap items-center justify-center gap-3 text-sm md:gap-5">
                <button
                  disabled={page === 0}
                  onClick={() => {
                    setPage((p) => p - 1);
                    setExpanded(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  {t("categories_previous")}
                </button>
                <span className="text-slate-700">
                  {t("categories_page_of")} {page + 1} / {Math.ceil(result.total / 12)}
                </span>
                <button
                  disabled={!result.has_more}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setExpanded(null);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  {t("categories_next")}
                </button>
              </nav>
            )}
          </>
        )}
      </main>
    </MainLayout>
  );
}
