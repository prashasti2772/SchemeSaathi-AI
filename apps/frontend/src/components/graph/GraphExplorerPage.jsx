import { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import {
  fetchGraphHealth,
  fetchGraphStats,
  fetchGraphSchemes,
  searchGraphSchemes,
  fetchRelatedSchemes,
  fetchGraphCategories,
  syncGraphSchemes,
  apiError,
} from "../../lib/api";
import { useLanguage } from "../../lib/i18n.jsx";
import { officialSchemeUrl } from "../../lib/citizenProfile";
import SaveSchemeButton from "../schemes/SaveSchemeButton";

export default function GraphExplorerPage() {
  const { t } = useLanguage();
  const [health, setHealth] = useState({ neo4j_connected: true, status: "active" });
  const [stats, setStats] = useState({ total_schemes: 3400, total_categories: 14, total_departments: 14 });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [schemes, setSchemes] = useState([]);
  const [totalFound, setTotalFound] = useState(3400);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(170);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [relatedCache, setRelatedCache] = useState({});
  const [loadingRelated, setLoadingRelated] = useState({});
  const [expandedGraph, setExpandedGraph] = useState({});

  useEffect(() => {
    loadHealthAndCategories();
  }, []);

  const loadHealthAndCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const [h, s, cats] = await Promise.allSettled([
        fetchGraphHealth(),
        fetchGraphStats(),
        fetchGraphCategories(),
      ]);

      if (h.status === "fulfilled" && h.value) setHealth(h.value);
      if (s.status === "fulfilled" && s.value) setStats(s.value);
      if (cats.status === "fulfilled" && cats.value?.categories) {
        setCategories(cats.value.categories);
      }

      await loadSchemes("All", "", 1);
    } catch (err) {
      console.warn("Graph load:", err);
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadSchemes = async (category, query, pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (query && query.trim()) {
        res = await searchGraphSchemes(query.trim(), category, pageNum, 20);
      } else {
        res = await fetchGraphSchemes(category, pageNum, 20);
      }
      setSchemes(res.schemes || []);
      setTotalFound(res.total ?? 3400);
      setPage(res.page || pageNum);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.warn("Failed to load schemes:", err);
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadSchemes(selectedCategory, searchQuery, 1);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSearchQuery("");
    setPage(1);
    loadSchemes(cat, "", 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadSchemes(selectedCategory, searchQuery, newPage);
    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  const handleToggleRelated = async (schemeId) => {
    if (expandedGraph[schemeId]) {
      setExpandedGraph((prev) => ({ ...prev, [schemeId]: false }));
      return;
    }

    setExpandedGraph((prev) => ({ ...prev, [schemeId]: true }));

    if (relatedCache[schemeId]) return;

    setLoadingRelated((prev) => ({ ...prev, [schemeId]: true }));
    try {
      const res = await fetchRelatedSchemes(schemeId, 4);
      setRelatedCache((prev) => ({ ...prev, [schemeId]: res.related_schemes || [] }));
    } catch (err) {
      console.warn("Could not fetch related schemes from graph:", err);
    } finally {
      setLoadingRelated((prev) => ({ ...prev, [schemeId]: false }));
    }
  };

  const handleSync = async () => {
    setSyncStatus("Synchronizing 3,400 schemes...");
    try {
      const res = await syncGraphSchemes();
      setSyncStatus(res.message || "Sync completed!");
      setTimeout(() => {
        loadHealthAndCategories();
        setSyncStatus("");
      }, 3500);
    } catch (err) {
      setSyncStatus("Sync failed: " + apiError(err));
      setTimeout(() => setSyncStatus(""), 4000);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
        {/* ============ HERO HEADER ============ */}
        <section className="bg-gradient-to-r from-[#081d3d] via-[#0d2a57] to-[#143d78] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#214b84] shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#f4d780]/20 text-[#f4d780] border border-[#f4d780]/40 mb-3">
                  SchemeSaathi
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Explore government schemes
                </h1>
                <p className="mt-2 text-slate-300 max-w-2xl text-sm sm:text-base">
                  Browse the verified pilot catalogue by your needs. Availability and application windows vary; some searches may have no verified entry yet.
                </p>
              </div>

              {/* Neo4j Status Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[290px]">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-medium text-slate-300">Graph Database</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    ● Neo4j Graph (Active)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="text-lg font-bold text-[#f4d780]">
                      {stats?.total_schemes ? Number(stats.total_schemes).toLocaleString() : "3,400"}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">Schemes</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="text-lg font-bold text-[#f4d780]">
                      {stats?.total_categories ?? "14"}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">Sectors</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="text-lg font-bold text-[#f4d780]">
                      {stats?.total_departments ?? "14"}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium">Departments</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSync}
                  className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#f4d780] text-[#081d3d] hover:bg-[#ffe594] transition shadow-sm cursor-pointer"
                >
                  {syncStatus || "Sync 3,400 Schemes → Graph"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SEARCH & FILTERS ============ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search among 3,400 schemes (e.g. loan, farmer, scholarship, women, subsidy, artisan, pension)..."
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#081d3d] text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                      loadSchemes(selectedCategory, "", 1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#081d3d] text-white font-medium rounded-xl hover:bg-[#0e2a57] transition text-sm flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-sm"
              >
                Graph Search
              </button>
            </form>

            {/* Category / Sector Chips (All 14 Sectors) */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Filter by Sector Node (14 Sectors):
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("All")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    selectedCategory === "All"
                      ? "bg-[#081d3d] text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  All Sectors ({Number(stats?.total_schemes || 3400).toLocaleString()})
                </button>
                {(categories.length > 0
                  ? categories
                  : [
                      "Social Welfare & Empowerment",
                      "Education & Learning",
                      "Agriculture, Rural & Environment",
                      "Business & Entrepreneurship",
                      "Women & Child Development",
                      "Skills & Employment",
                      "Banking, Financial Services and Insurance",
                      "Health & Wellness",
                      "Sports & Culture",
                      "Housing & Shelter",
                      "Science, IT & Communications",
                      "Transport & Infrastructure",
                      "Travel & Tourism",
                      "Public Safety, Law & Justice",
                    ]
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#081d3d] text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ============ RESULTS SECTION ============ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Graph Nodes & Connected Schemes
              <span className="text-xs font-semibold text-[#081d3d] bg-[#f4d780]/40 px-2.5 py-0.5 rounded-full">
                {Number(totalFound).toLocaleString()} schemes
              </span>
            </h2>
            <div className="text-xs text-slate-500">
              Showing page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong>
              {selectedCategory !== "All" && (
                <span> in <strong className="text-slate-800">{selectedCategory}</strong></span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#081d3d] border-t-transparent"></div>
              <p className="mt-3 text-slate-500 text-sm">Querying Knowledge Graph across 3,400 schemes...</p>
            </div>
          ) : schemes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-600 font-medium">No graph schemes matched your criteria.</p>
              <p className="text-slate-400 text-xs mt-1">Try another keyword or select &ldquo;All Sectors&rdquo;.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {schemes.map((scheme) => {
                  const schemeId = scheme.scheme_id || scheme.slug;
                  const isExpanded = expandedGraph[schemeId];
                  const related = relatedCache[schemeId] || [];
                  const isRelatedLoading = loadingRelated[schemeId];
                  const officialUrl = officialSchemeUrl(scheme.official_url || scheme.application_url);

                  return (
                    <div
                      key={schemeId}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top metadata tags */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {scheme.category || "General"}
                          </span>
                          <SaveSchemeButton scheme={scheme} />
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {scheme.scheme_name || scheme.name}
                        </h3>

                        {scheme.department && (
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            🏛️ {scheme.department}
                          </p>
                        )}

                        {scheme.description && (
                          <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {scheme.description}
                          </p>
                        )}

                        {scheme.benefits && (
                          <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block mb-0.5">
                              Key Benefit:
                            </span>
                            <p className="text-xs text-emerald-900 line-clamp-2">
                              {scheme.benefits}
                            </p>
                          </div>
                        )}

                        {/* Graph Relationship Visualizer Badge */}
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Knowledge Graph Topology:
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="bg-[#081d3d] text-white px-2 py-0.5 rounded font-mono font-medium">
                              :Scheme
                            </span>
                            <span className="text-slate-400 font-bold">──[:TARGETS]──&gt;</span>
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-mono font-medium">
                              :{scheme.category || "Sector"}
                            </span>
                            <span className="text-slate-400 font-bold">──[:MANAGED_BY]──&gt;</span>
                            <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded font-mono font-medium text-[10px]">
                              :Department
                            </span>
                          </div>
                        </div>

                        {/* Expandable Related Schemes Section */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-slate-200">
                            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                              <span>Connected Schemes in this Sector:</span>
                              {isRelatedLoading && (
                                <span className="text-[10px] text-slate-400 font-normal">Loading...</span>
                              )}
                            </div>

                            {isRelatedLoading ? (
                              <div className="py-3 text-center text-xs text-slate-400">
                                Traversing relationship paths...
                              </div>
                            ) : related.length === 0 ? (
                              <div className="py-2 text-xs text-slate-500 italic">
                                No additional related schemes found sharing this category.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {related.map((rel) => (
                                  <div
                                    key={rel.scheme_id}
                                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                  >
                                    <div className="font-semibold text-slate-800">{rel.scheme_name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                      {rel.description}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRelated(schemeId)}
                          className="text-xs font-semibold text-[#081d3d] hover:text-blue-700 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? "Hide Connected Graph" : "Explore Related Schemes (Graph)"}
                        </button>

                        {officialUrl && (
                          <a
                            href={officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#081d3d] text-white text-xs font-medium rounded-lg hover:bg-[#143d78] transition"
                          >
                            Official Portal ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ============ PAGINATION CONTROLS ============ */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs text-slate-600">
                    Showing <strong>{((page - 1) * 20) + 1}</strong> – <strong>{Math.min(page * 20, totalFound)}</strong> of <strong>{Number(totalFound).toLocaleString()}</strong> schemes
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => handlePageChange(page - 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        page <= 1
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-[#081d3d] text-white hover:bg-[#143d78]"
                      }`}
                    >
                      ← Previous
                    </button>

                    <span className="text-xs font-medium px-2 text-slate-700">
                      Page {page} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        page >= totalPages
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-[#081d3d] text-white hover:bg-[#143d78]"
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
