import { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import { apiError, fetchCatalogSchemes } from "../../lib/api";
import { useLanguage } from "../../lib/i18n.jsx";

const baseCategories = [
  {
    id: 1,
    nameKey: "category_loan_name",
    queryKey: "loan",
    icon: "💰",
    defaultCount: 95,
    descriptionKey: "category_loan_desc",
    tags: ["Loans", "Credit", "Finance", "Mudra", "PMEGP"],
  },
  {
    id: 2,
    nameKey: "category_msme_name",
    queryKey: "MSME",
    icon: "🏭",
    defaultCount: 140,
    descriptionKey: "category_msme_desc",
    tags: ["MSME", "Industry", "Subsidies", "Manufacturing"],
  },
  {
    id: 3,
    nameKey: "category_startup_name",
    queryKey: "startup",
    icon: "🚀",
    defaultCount: 42,
    descriptionKey: "category_startup_desc",
    tags: ["Startup", "Innovation", "Incubation", "Funding"],
  },
  {
    id: 4,
    nameKey: "category_women_name",
    queryKey: "women",
    icon: "👩‍💼",
    defaultCount: 58,
    descriptionKey: "category_women_desc",
    tags: ["Women", "Entrepreneurship", "Mahila", "Grants"],
  },
  {
    id: 5,
    nameKey: "category_agri_name",
    queryKey: "agriculture",
    icon: "🌾",
    defaultCount: 88,
    descriptionKey: "category_agri_desc",
    tags: ["Agriculture", "Rural", "Farming", "Solar"],
  },
  {
    id: 6,
    nameKey: "category_education_name",
    queryKey: "education",
    icon: "🎓",
    defaultCount: 64,
    descriptionKey: "category_education_desc",
    tags: ["Education", "Skills", "Training", "Scholarships"],
  },
  {
    id: 7,
    nameKey: "category_craft_name",
    queryKey: "handicraft",
    icon: "🎨",
    defaultCount: 36,
    descriptionKey: "category_craft_desc",
    tags: ["Handicraft", "Artisans", "Vishwakarma", "Weaving"],
  },
  {
    id: 8,
    nameKey: "category_housing_name",
    queryKey: "housing",
    icon: "🏠",
    defaultCount: 28,
    descriptionKey: "category_housing_desc",
    tags: ["Housing", "Urban", "Infrastructure", "SVANidhi"],
  },
  {
    id: 9,
    nameKey: "category_welfare_name",
    queryKey: "welfare",
    icon: "🤝",
    defaultCount: 76,
    descriptionKey: "category_welfare_desc",
    tags: ["Welfare", "Pension", "Social Security", "Inclusion"],
  },
  {
    id: 10,
    nameKey: "category_subsidy_name",
    queryKey: "subsidy",
    icon: "💳",
    defaultCount: 110,
    descriptionKey: "category_subsidy_desc",
    tags: ["Subsidy", "Grant", "DBT", "Financial Support"],
  },
  {
    id: 11,
    nameKey: "category_technology_name",
    queryKey: "technology",
    icon: "💻",
    defaultCount: 32,
    descriptionKey: "category_technology_desc",
    tags: ["Technology", "Green Energy", "Solar", "Digital"],
  },
  {
    id: 12,
    nameKey: "category_health_name",
    queryKey: "health",
    icon: "🏥",
    defaultCount: 45,
    descriptionKey: "category_health_desc",
    tags: ["Health", "Insurance", "Medical", "Safety"],
  },
];

const QUICK_TAGS = [
  "All",
  "Loans",
  "MSME",
  "Startup",
  "Women",
  "Agriculture",
  "Skills",
  "Handicraft",
  "Subsidy",
  "Health",
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

  const hasFilter = Boolean(query.trim()) || Boolean(category);

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
        const data = await fetchCatalogSchemes([category, query.trim()].filter(Boolean).join(" "), 12, page * 12);
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
      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[28px] border border-[#f4d780]/60 bg-[radial-gradient(circle_at_top_left,_rgba(216,170,45,0.18),_transparent_30%),linear-gradient(135deg,_#081d3d_0%,_#0d2b55_46%,_#143d73_100%)] p-6 shadow-[0_22px_50px_rgba(8,29,61,0.18)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#f4d780]">{t("categories_page_badge")}</p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-5xl">{t("categories_page_title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">{t("categories_page_subtitle")}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur-sm">
              {baseCategories.length} categories · curated public schemes
            </div>
          </div>
        </div>

        <div className="my-6 rounded-2xl border border-amber-200 bg-[#fffaf0] p-4 text-sm leading-7 text-slate-700 shadow-sm">
          {t("categories_notice")}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] md:p-6">
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
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none transition focus:border-[#0d2b55] focus:bg-white focus:ring-4 focus:ring-[#d8aa2d]/20"
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
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-[#0d2b55]">Browse by category</h2>
              <span className="text-sm text-slate-500">{baseCategories.length} categories</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {baseCategories.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-1 hover:border-[#f4d780] hover:shadow-[0_18px_32px_rgba(216,170,45,0.14)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7dc] text-2xl shadow-inner shadow-[#f4d780]/30">
                      {item.icon}
                    </div>
                    <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#0d2b55]">
                      {item.defaultCount}+ resources
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-[#0d2b55]">{t(item.nameKey)}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{t(item.descriptionKey)}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-600"
                      >
                        {tag}
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
                    Explore {t(item.nameKey)}
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
                Showing results for <span className="font-bold">{t(selectedCategory.nameKey)}</span>
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
                  <article key={s.scheme_name} className="flex flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {s.level || "Catalogue record"}
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
                            <dd className="whitespace-pre-wrap">{s[key] || "Not recorded. Check the official guidance."}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-200 pt-4 text-sm">
                      {/^(https?:\/\/)/i.test(s.official_url || "") && (
                        <a href={s.official_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#0d2b55]">
                          {t("categories_official_guidance")}
                        </a>
                      )}
                      <a href={"/ai-assistant?q=" + encodeURIComponent("Tell me about " + s.scheme_name)} className="font-semibold underline text-[#0d2b55]">
                        {t("categories_ask_assistant")}
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!busy && !error && result.total > 12 && (
              <nav aria-label={t("Search result pages")} className="my-8 flex items-center justify-center gap-5 text-sm">
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
