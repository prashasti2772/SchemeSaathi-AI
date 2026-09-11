import { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import { apiError, fetchCatalogSchemes } from "../../lib/api";

const baseCategories = [
  {
    id: 1,
    name: "Business Loans & Credit",
    queryKey: "loan",
    icon: "💰",
    defaultCount: 95,
    description: "Financial support, subsidized credit facilities, and working capital loans to start or expand businesses.",
    tags: ["Loans", "Credit", "Finance", "Mudra", "PMEGP"],
  },
  {
    id: 2,
    name: "MSME & Industrial Incentives",
    queryKey: "MSME",
    icon: "🏭",
    defaultCount: 140,
    description: "Government subsidies, capital investment incentives, and technology upgradation for micro, small & medium enterprises.",
    tags: ["MSME", "Industry", "Subsidies", "Manufacturing"],
  },
  {
    id: 3,
    name: "Startup & Innovation Support",
    queryKey: "startup",
    icon: "🚀",
    defaultCount: 42,
    description: "Seed funding, incubation support, patent filing assistance, and tax exemptions for innovative startups.",
    tags: ["Startup", "Innovation", "Incubation", "Funding"],
  },
  {
    id: 4,
    name: "Women Entrepreneurship & Empowerment",
    queryKey: "women",
    icon: "👩‍💼",
    defaultCount: 58,
    description: "Special financial grants, collateral-free loans, and skill development programs dedicated to women entrepreneurs.",
    tags: ["Women", "Entrepreneurship", "Mahila", "Grants"],
  },
  {
    id: 5,
    name: "Agriculture & Rural Enterprise",
    queryKey: "agriculture",
    icon: "🌾",
    defaultCount: 88,
    description: "Subsidies for farmers, agri-business loans, cold storage funding, solar pumps, and rural self-employment.",
    tags: ["Agriculture", "Rural", "Farming", "Solar"],
  },
  {
    id: 6,
    name: "Education, Skill Development & Training",
    queryKey: "education",
    icon: "🎓",
    defaultCount: 64,
    description: "Skill training stipends, vocational certification, apprenticeship schemes, and student welfare support.",
    tags: ["Education", "Skills", "Training", "Scholarships"],
  },
  {
    id: 7,
    name: "Artisans, Handicraft & Traditional Crafts",
    queryKey: "handicraft",
    icon: "🎨",
    defaultCount: 36,
    description: "Toolkit incentives, exhibition grants, coir, silk, handloom, and craft development schemes for artisans.",
    tags: ["Handicraft", "Artisans", "Vishwakarma", "Weaving"],
  },
  {
    id: 8,
    name: "Housing & Urban Development",
    queryKey: "housing",
    icon: "🏠",
    defaultCount: 28,
    description: "Interest subsidies for affordable housing, urban infrastructure, and street vendor loans (PM SVANidhi).",
    tags: ["Housing", "Urban", "Infrastructure", "SVANidhi"],
  },
  {
    id: 9,
    name: "Social Welfare & Pensions",
    queryKey: "welfare",
    icon: "🤝",
    defaultCount: 76,
    description: "Social security pensions, SC/ST/OBC welfare programs, disability assistance, and community welfare.",
    tags: ["Welfare", "Pension", "Social Security", "Inclusion"],
  },
  {
    id: 10,
    name: "Direct Subsidies & Financial Grants",
    queryKey: "subsidy",
    icon: "💳",
    defaultCount: 110,
    description: "Direct Bank Transfer (DBT) subsidies, margin money support, and capital grants for eligible beneficiaries.",
    tags: ["Subsidy", "Grant", "DBT", "Financial Support"],
  },
  {
    id: 11,
    name: "Digital & Green Technology",
    queryKey: "technology",
    icon: "💻",
    defaultCount: 32,
    description: "Energy & water conservation subsidies, solar rooftop adoption, and digital transformation for MSMEs.",
    tags: ["Technology", "Green Energy", "Solar", "Digital"],
  },
  {
    id: 12,
    name: "Healthcare & Social Insurance",
    queryKey: "health",
    icon: "🏥",
    defaultCount: 45,
    description: "Government programs supporting healthcare, insurance coverage (Ayushman Bharat), and medical assistance.",
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
  const initial = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(initial.get("q") || "");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ schemes: [], total: 0 });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const data = await fetchCatalogSchemes([category, query.trim()].filter(Boolean).join(" "), 12, page * 12);
        if (active) setResult(data);
      } catch (e) { if (active) setError(apiError(e)); }
      finally { if (active) setBusy(false); }
    }, 250);
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);
    return () => { active = false; clearTimeout(timer); };
  }, [query, category, page, retry]);
  function reset() { setQuery(""); setCategory(""); setPage(0); setExpanded(null); }
  return <MainLayout><main className="mx-auto max-w-6xl px-5 py-12">
    <p className="text-sm font-semibold text-amber-700">SchemeSaathi - SIH26092</p>
    <h1 className="mt-2 text-3xl font-bold">Explore government schemes</h1>
    <p className="mt-3 text-slate-600">Search business finance, self-employment, skills and inclusion support. Use Find Schemes for screening against your profile.</p>
    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Catalogue records may be incomplete or outdated. A search result does not confirm eligibility or that applications are open. Check the linked official guidance before applying.</div>
    <label className="block font-medium" htmlFor="scheme-search">Search schemes</label>
    <input id="scheme-search" type="search" maxLength={150} value={query} onChange={e => {setQuery(e.target.value); setPage(0); setExpanded(null);}} placeholder="Scheme name or keywords, e.g. MUDRA, women loan, tailoring" className="mt-2 w-full rounded-xl border bg-white p-4" />
    <div className="my-4 flex flex-wrap gap-2" aria-label="Scheme categories">
      <button aria-pressed={!category} onClick={() => {setCategory(""); setPage(0);}} className="rounded-full border px-4 py-2">All schemes</button>
      {baseCategories.map(c => <button key={c.id} aria-pressed={category === c.queryKey} onClick={() => {setCategory(category === c.queryKey ? "" : c.queryKey); setPage(0); setExpanded(null);}} className={`rounded-full border px-4 py-2 text-sm ${category === c.queryKey ? "bg-[#0d2b55] text-white" : "bg-white"}`}>{c.name}</button>)}
    </div>
    <div aria-live="polite" className="my-6">{busy ? "Searching catalogue..." : error ? <p role="alert" className="text-red-700">{error} <button className="underline" onClick={() => setRetry(n => n+1)}>Retry search</button></p> : `${result.total} schemes found`}</div>
    {!busy && !error && result.schemes.length === 0 && <div className="rounded-xl border bg-white p-8"><h2 className="text-xl font-bold">No matching schemes</h2><p className="my-3">Try fewer keywords or remove the category filter.</p><button className="underline" onClick={reset}>Clear search and filters</button></div>}
    {!busy && !error && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{result.schemes.map((s, i) => <article key={s.scheme_name} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{s.level || "Catalogue record"}</p><h2 className="my-2 text-lg font-bold">{s.scheme_name}</h2>
      <p className="line-clamp-4 text-sm text-slate-600">{s.description}</p>
      <button aria-expanded={expanded === i} onClick={() => setExpanded(expanded === i ? null : i)} className="my-4 text-left font-semibold underline">{expanded === i ? "Hide details" : "Benefits, eligibility and application details"}</button>
      {expanded === i && <dl className="mb-4 space-y-3 text-sm">{[["Benefits","benefits"],["Eligibility","eligibility"],["Documents","documents"],["How to apply","application_process"]].map(([label,key]) => <div key={key}><dt className="font-bold">{label}</dt><dd className="whitespace-pre-wrap">{s[key] || "Not recorded. Check the official guidance."}</dd></div>)}</dl>}
      <div className="mt-auto flex flex-wrap gap-3 border-t pt-4 text-sm">{/^https?:\/\//i.test(s.official_url || "") && <a href={s.official_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Official guidance</a>}<a href={"/ai-assistant?q="+encodeURIComponent("Tell me about " + s.scheme_name)} className="underline">Ask assistant</a></div>
    </article>)}</div>}
    {!busy && !error && result.total > 12 && <nav aria-label="Search result pages" className="my-8 flex items-center justify-center gap-5"><button disabled={page === 0} onClick={() => {setPage(p => p-1); setExpanded(null);}} className="rounded border p-3 disabled:opacity-40">Previous</button><span>Page {page+1} of {Math.ceil(result.total/12)}</span><button disabled={!result.has_more} onClick={() => {setPage(p => p+1); setExpanded(null);}} className="rounded border p-3 disabled:opacity-40">Next</button></nav>}
  </main></MainLayout>;
}
