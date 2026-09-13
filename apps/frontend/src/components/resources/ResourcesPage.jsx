import { useMemo, useState } from "react";
import { MainLayout } from "../layout";
import { useLanguage } from "../../lib/i18n.jsx";

const resources = [
  { id: "find", titleKey: "resource_find_title", categoryKey: "resource_category_guides", url: "https://www.myscheme.gov.in/", descriptionKey: "resource_find_desc" },
  { id: "apply", titleKey: "resource_apply_title", categoryKey: "resource_category_application", url: "https://www.myscheme.gov.in/", descriptionKey: "resource_apply_desc" },
  { id: "documents", titleKey: "resource_documents_title", categoryKey: "resource_category_documents", url: "https://www.digilocker.gov.in/", descriptionKey: "resource_documents_desc" },
  { id: "udyam", titleKey: "resource_udyam_title", categoryKey: "resource_category_application", url: "https://udyamregistration.gov.in/", descriptionKey: "resource_udyam_desc" },
  { id: "startup", titleKey: "resource_startup_title", categoryKey: "resource_category_guides", url: "https://www.startupindia.gov.in/", descriptionKey: "resource_startup_desc" },
  { id: "loans", titleKey: "resource_loans_title", categoryKey: "resource_category_guides", url: "https://www.jansamarth.in/", descriptionKey: "resource_loans_desc" },
];
const steps = ["resource_step_1", "resource_step_2", "resource_step_3", "resource_step_4"];
const documents = ["doc_identity", "doc_address", "doc_social_category", "doc_income", "doc_business_registration", "doc_bank", "doc_business_plan"];

export default function ResourcesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState([]);

  const filtered = useMemo(() => {
    return resources.filter((resource) => {
      const matchesCategory = category === "all" || resource.categoryKey === category;
      const haystack = `${t(resource.titleKey)} ${t(resource.descriptionKey)}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search, t]);

  const categoryOptions = [
    { key: "all", label: t("resource_category_all") },
    { key: "resource_category_guides", label: t("resource_category_guides") },
    { key: "resource_category_application", label: t("resource_category_application") },
    { key: "resource_category_documents", label: t("resource_category_documents") },
  ];

  return (
    <MainLayout>
      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0d2b55] to-[#1a4f8d] p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">{t("resources_badge")}</p>
          <h1 className="mt-4 text-3xl font-bold md:text-5xl">{t("resources_title")}</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-100 md:text-lg">{t("resources_desc")}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700" htmlFor="resource-search">
            {t("nav_search")}
          </label>
          <input
            id="resource-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("resources_search_placeholder")}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-[#0d2b55]"
          />

          <div className="mt-5 flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={category === option.key}
                onClick={() => setCategory(option.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${category === option.key ? "bg-[#0d2b55] text-white border-[#0d2b55]" : "bg-white text-slate-700 border-slate-300"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!filtered.length && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            <p>{t("resources_no_results")}</p>
            <button type="button" className="mt-3 underline" onClick={() => { setSearch(""); setCategory("all"); }}>{t("common_clear")}</button>
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((resource) => (
            <article key={resource.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{t(resource.categoryKey)}</p>
              <h2 className="mt-3 text-xl font-bold text-[#0d2b55]">{t(resource.titleKey)}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{t(resource.descriptionKey)}</p>
              <button type="button" className="mt-5 text-left text-sm font-semibold underline text-[#0d2b55]" onClick={() => { setSelected(resource); setChecked([]); }}>
                {t("common_read_resource")}
              </button>
            </article>
          ))}
        </div>

        {selected && (
          <section aria-labelledby="resource-title" className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="resource-title" className="text-2xl font-bold text-[#0d2b55]">{t(selected.titleKey)}</h2>
              <button type="button" className="text-sm font-semibold underline text-[#0d2b55]" onClick={() => setSelected(null)}>{t("resources_close")}</button>
            </div>
            <p className="mt-4 text-base leading-8 text-slate-600">{t(selected.descriptionKey)}</p>

            {selected.id === "documents" ? (
              <fieldset className="mt-6">
                <legend className="mb-3 text-base font-semibold text-[#0d2b55]">{t("resources_document_checklist")}</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {documents.map((document) => (
                    <label key={document} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked.includes(document)}
                        onChange={() => setChecked((values) => values.includes(document) ? values.filter((item) => item !== document) : [...values, document])}
                      />
                      {t(document)}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <ol className="mt-6 list-decimal space-y-3 pl-6 text-sm leading-7 text-slate-700">
                {steps.map((step) => (
                  <li key={step}>{t(step)}</li>
                ))}
              </ol>
            )}

            <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center rounded-xl bg-[#0d2b55] px-4 py-3 text-sm font-semibold text-white">
              {t("resources_open_official")}
            </a>
          </section>
        )}
      </main>
    </MainLayout>
  );
}
