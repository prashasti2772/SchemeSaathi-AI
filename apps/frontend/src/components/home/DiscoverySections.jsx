import { useEffect, useState } from "react";
import { fetchCatalogSchemes } from "../../lib/api";
import { officialSchemeUrl } from "../../lib/citizenProfile";
import { useLanguage } from "../../lib/i18n.jsx";

const categories = [
  ["Grants and subsidies", "subsidy"],
  ["Skills and training", "training"],
  ["Artisan support", "artisan"],
  ["Marketing and technology", "marketing"],
  ["Loans and credit", "loan"],
  ["Employment and livelihoods", "livelihood"],
  ["Education and scholarships", "scholarship"],
  ["Health and social support", "health"],
];
const sectionClass = "mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10";
const headingClass = "text-2xl font-extrabold tracking-tight text-[#081d3d]";
const cardClass = "min-w-0 rounded-3xl border border-[#d7dfe9] bg-white p-6 shadow-[0_12px_30px_rgba(8,29,61,0.05)]";

export default function DiscoverySections() {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState(null);
  useEffect(() => {
    let active = true;
    fetchCatalogSchemes("", 50).then(data => {
      const preferred = ["pm-vishwakarma", "pmegp", "pmkvy-4-stt", "esdp", "nssh", "pmmy"];
      const rows = [...data.schemes].sort((a, b) => {
        const rank = scheme => {
          const index = preferred.indexOf(scheme.slug || scheme.scheme_id);
          return index < 0 ? preferred.length : index;
        };
        return rank(a) - rank(b);
      });
      if (active) setFeatured(rows.slice(0, 3));
    }).catch(() => { if (active) setFeatured([]); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <section className={sectionClass} aria-labelledby="home-how">
        <h2 id="home-how" className={headingClass}>{t("entrepreneur_how_title")}</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map(step => <div key={step} className={cardClass}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0d2b55] font-bold text-white">{step}</span>
            <h3 className="mt-4 text-lg font-bold text-[#0d2b55]">{t(`entrepreneur_step${step}`)}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{t(`entrepreneur_step${step}_body`)}</p>
          </div>)}
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="home-categories">
        <h2 id="home-categories" className={headingClass}>{t("entrepreneur_categories_title")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{t("entrepreneur_categories_note")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(([label, query]) => <a key={query} href={`/categories?q=${encodeURIComponent(query)}`} className="rounded-2xl border border-[#d7dfe9] bg-[#fffaf0] px-5 py-5 text-sm font-bold text-[#0d2b55] transition hover:border-[#d8aa2d] hover:bg-[#fff3cc]">{t(label)} <span aria-hidden="true">→</span></a>)}
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="home-featured">
        <h2 id="home-featured" className={headingClass}>{t("entrepreneur_featured_title")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{t("entrepreneur_featured_note")}</p>
        {featured === null ? <p className="mt-5 text-sm text-slate-600" role="status">{t("common_loading")}</p> : featured.length ? <div className="mt-5 grid gap-5 md:grid-cols-3">
          {featured.map(scheme => {
            const official = officialSchemeUrl(scheme.application_url || scheme.official_url);
            return <article key={scheme.scheme_id} className={`${cardClass} flex flex-col`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6e5300]">{t(scheme.category)}</p>
              <h3 className="mt-3 text-lg font-bold text-[#0d2b55]">{scheme.scheme_name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{scheme.benefits || scheme.description}</p>
              <p className="mt-4 text-xs text-slate-500">{t("Guidance reviewed")}: {scheme.verified_on}</p>
              {official && <a href={official} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm font-semibold text-[#0d2b55] underline underline-offset-4">{t("Official application guidance")}</a>}
              <a href={`/categories?q=${encodeURIComponent(scheme.scheme_name)}`} className="mt-auto pt-4 text-sm font-semibold text-[#0d2b55] underline underline-offset-4">{t("Benefits, eligibility and application details")}</a>
            </article>;
          })}
        </div> : <p className="mt-5 text-sm text-slate-600">{t("entrepreneur_featured_unavailable")}</p>}
        <a href="/search" className="mt-5 inline-block text-sm font-semibold text-[#0d2b55] underline underline-offset-4">{t("Browse all schemes")}</a>
      </section>

      <section className={sectionClass} aria-labelledby="home-benefits">
        <h2 id="home-benefits" className={headingClass}>{t("entrepreneur_benefits_title")}</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map(item => <div key={item} className={cardClass}>
            <h3 className="text-lg font-bold text-[#0d2b55]">{t(`entrepreneur_benefit${item}`)}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{t(`entrepreneur_benefit${item}_body`)}</p>
          </div>)}
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="home-faq">
        <h2 id="home-faq" className={headingClass}>{t("entrepreneur_faq_title")}</h2>
        <div className="mt-5 space-y-3">
          {[1, 2, 3, 4].map(item => <details key={item} className="rounded-2xl border border-[#d7dfe9] bg-white p-5">
            <summary className="cursor-pointer text-base font-semibold text-[#0d2b55]">{t(`entrepreneur_faq${item}_q`)}</summary>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{t(`entrepreneur_faq${item}_a`)}</p>
          </details>)}
        </div>
      </section>

      <section className={`${sectionClass} pb-12`}>
        <div className="rounded-3xl bg-[#0d2b55] p-7 text-white sm:p-10">
          <h2 className="text-2xl font-extrabold">{t("entrepreneur_cta_title")}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">{t("entrepreneur_cta_body")}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a href="/find-schemes" className="rounded-xl bg-[#d8aa2d] px-5 py-3 text-sm font-bold text-[#081d3d]">{t("homepage_cta_find")}</a>
            <a href="/ai-assistant" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold">{t("assistant_title")}</a>
          </div>
        </div>
      </section>
    </>
  );
}
