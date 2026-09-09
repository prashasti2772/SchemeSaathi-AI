import React, { useEffect, useMemo, useState } from "react";
import { MainLayout } from "../layout";
import { fetchCatalogSchemes } from "../../lib/api";

/* ======= BASE CATEGORY CONFIGURATION ========= */

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

/* ============================================================
   PAGE COMPONENT
============================================================ */

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("All");
  const [categoryCounts, setCategoryCounts] = useState({});
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);

  /* ===== FETCH LIVE CATALOG COUNTS PER CATEGORY ======= */
  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const counts = {};
        for (const cat of baseCategories) {
          const data = await fetchCatalogSchemes(cat.queryKey, 100);
          counts[cat.id] = data.total || cat.defaultCount;
        }
        if (isMounted) {
          setCategoryCounts(counts);
        }
      } catch (err) {
        console.warn("Could not fetch category counts:", err);
      }
    };
    loadCounts();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ==========================================================
     FILTER CATEGORIES BY SEARCH & QUICK TAG
  ========================================================== */

  const filteredCategories = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return baseCategories.filter((category) => {
      const matchesTag =
        selectedTag === "All" ||
        category.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      if (!searchText) return matchesTag;

      const matchesSearch =
        category.name.toLowerCase().includes(searchText) ||
        category.description.toLowerCase().includes(searchText) ||
        category.tags.some((tag) => tag.toLowerCase().includes(searchText));

      return matchesTag && matchesSearch;
    });
  }, [search, selectedTag]);

  /* ======= HANDLE VIEW CATEGORY SCHEMES MODAL ======== */

  const handleOpenModal = (category) => {
    setActiveCategoryModal(category);
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        {/* ====== HERO SECTION ======= */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-300 px-5 py-12 sm:px-8">
            <div className="mx-auto max-w-190 text-center">
              <div className="mx-auto mb-3 inline-flex items-center rounded-full bg-[#fff4c7] px-3.5 py-1 text-[11px] font-bold text-[#9b7815]">
                🏛️ 650+ Verified Welfare Schemes
              </div>

              <h1 className="text-[30px] font-extrabold tracking-tight text-[#172b49] sm:text-[36px]">
                Explore Government Schemes by Category
              </h1>

              <p className="mx-auto mt-3 max-w-170 text-[14px] leading-6 text-slate-500">
                Discover government subsidies, credit facilities, training programs, and welfare support across key sectors.
              </p>
            </div>

            {/* ================= SEARCH INPUT ================= */}
            <div className="mx-auto mt-8 max-w-162.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories (e.g. Loans, MSME, Women, Solar, Agriculture)..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Clear ✕
                  </button>
                )}
              </div>
            </div>

            {/* ================= QUICK FILTER TAG CHIPS ================= */}
            <div className="mx-auto mt-6 flex max-w-200 flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                    selectedTag === tag
                      ? "bg-[#0d2b55] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============= MAIN CONTENT ============= */}
        <main className="mx-auto max-w-300 px-5 sm:px-8">
          {/* ================= SUMMARY HEADER ================= */}
          <div className="flex flex-col gap-2 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#172b49]">
                Browse Categories ({filteredCategories.length})
              </h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                Click any category to view all official schemes available in that category.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-[#0d2b55] shadow-xs">
              Total 650+ Catalog Schemes Grounded
            </div>
          </div>

          {/* ============= CATEGORY GRID ============= */}
          {filteredCategories.length === 0 ? (
            <EmptyCategories
              onReset={() => {
                setSearch("");
                setSelectedTag("All");
              }}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  liveCount={categoryCounts[category.id]}
                  onViewSchemes={() => handleOpenModal(category)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ============= MODAL: SCHEMES IN SELECTED CATEGORY ============= */}
      {activeCategoryModal && (
        <CategorySchemesModal
          category={activeCategoryModal}
          onClose={() => setActiveCategoryModal(null)}
        />
      )}
    </MainLayout>
  );
}

/* ======= CATEGORY CARD ======= */

function CategoryCard({ category, liveCount, onViewSchemes }) {
  const countDisplay = liveCount || category.defaultCount;

  return (
    <article
      onClick={onViewSchemes}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#d7aa2d] hover:shadow-md cursor-pointer"
    >
      <div>
        {/* TOP ROW */}
        <div className="flex items-start justify-between">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#0d2b55] text-2xl shadow-xs transition group-hover:scale-105">
            {category.icon}
          </div>

          <span className="rounded-full bg-[#fff5c9] px-3 py-1 text-[11px] font-bold text-[#8c6b00]">
            {countDisplay} Schemes
          </span>
        </div>

        {/* TITLE & DESCRIPTION */}
        <h3 className="mt-5 text-[18px] font-bold text-[#172b49] transition-colors group-hover:text-[#0d2b55]">
          {category.name}
        </h3>

        <p className="mt-2 text-[12px] leading-5 text-slate-500">
          {category.description}
        </p>

        {/* TAGS */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {category.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ACTION BUTTON */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewSchemes(); }}
          className="flex h-9.5 w-full items-center justify-center rounded-lg bg-[#0d2b55] text-[12px] font-semibold text-white transition hover:bg-[#173b70] active:scale-[0.99]"
        >
          View All {countDisplay} Schemes →
        </button>
      </div>
    </article>
  );
}

/* ======= CATEGORY SCHEMES MODAL ======= */

function CategorySchemesModal({ category, onClose }) {
  const [schemes, setSchemes] = useState([]);
  const [modalSearch, setModalSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadSchemes = async () => {
      setIsLoading(true);
      try {
        const res = await fetchCatalogSchemes(category.queryKey, 60);
        if (isMounted) {
          setSchemes(res.schemes || []);
        }
      } catch (e) {
        console.error("Failed fetching category schemes:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadSchemes();
    return () => {
      isMounted = false;
    };
  }, [category]);

  const filteredModalSchemes = useMemo(() => {
    if (!modalSearch.trim()) return schemes;
    const q = modalSearch.toLowerCase();
    return schemes.filter(
      (s) =>
        (s.scheme_name || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.benefits || "").toLowerCase().includes(q)
    );
  }, [schemes, modalSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
      <div className="flex h-[88vh] max-h-180 w-full max-w-220 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0d2b55] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <h3 className="text-[16px] font-bold tracking-tight">{category.name}</h3>
              <p className="text-[11px] text-slate-300">
                {schemes.length} verified government schemes loaded
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* CONTROLS — search only */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50 px-6 py-3.5">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              ⌕
            </span>
            <input
              type="text"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder={`Filter in ${category.name}...`}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-[#0d2b55]"
            />
          </div>
        </div>

        {/* SCHEMES LIST */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#fdfdfd] space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Loading official schemes for {category.name}...
            </div>
          ) : filteredModalSchemes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No matching schemes found for "{modalSearch}".
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredModalSchemes.map((doc, idx) => (
                <article
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-[#d7aa2d] transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[13px] font-bold leading-5 text-[#172b49]">
                        {doc.scheme_name}
                      </h4>
                      {doc.level && (
                        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                          {doc.level}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[11px] leading-4.5 text-slate-500 line-clamp-3">
                      {doc.description}
                    </p>

                    {doc.benefits && (
                      <div className="mt-3 rounded-md bg-slate-50 p-2 text-[10px]">
                        <span className="font-bold text-[#0d2b55]">Benefits: </span>
                        <span className="text-slate-700 line-clamp-2">{doc.benefits}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                    {doc.official_url ? (
                      <a
                        href={doc.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#0d2b55] hover:underline"
                      >
                        Visit Official Portal ↗
                      </a>
                    ) : (
                      <span className="text-slate-400">Government Portal</span>
                    )}

                    <span className="text-[10px] font-medium text-slate-400">
                      {doc.tags ? doc.tags.split(",")[0] : "Welfare"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ======= EMPTY STATE ========= */

function EmptyCategories({ onReset }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🔎
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#172b49]">No categories found</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-500">
        We couldn't find a category matching your search. Try another keyword.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-lg bg-[#0d2b55] px-5 py-2.5 text-[12px] font-medium text-white hover:bg-[#173b70]"
      >
        Clear Search & Filters
      </button>
    </div>
  );
}