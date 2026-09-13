import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n.jsx";
import ProgressSteps from "./ProgressSteps";
import { MainLayout } from "../layout";
import { fetchMatchingSchemes } from "../../lib/api";
import { getUserItem } from "../../lib/userStorage";

/* ====== LOCAL STORAGE HELPER (scoped to the signed-in account) ====== */

function getLocalStorageData(key) {
  return getUserItem(key);
}

/* ====== BUILD THE API PAYLOAD FROM THE WIZARD'S SAVED STEPS ====== */

function buildProfilePayload(personal, business, other) {
  return {
    phone_number: personal?.phoneNumber || "",
    full_name: personal?.fullName || "",
    age: personal?.age ? Number(personal.age) : null,
    gender: personal?.gender || null,
    state: personal?.state,
    district: personal?.district,
    disability: personal?.disability === "Yes",
    rural: personal?.residence === "Rural",
    location: [personal?.district, personal?.state].filter(Boolean).join(", "),
    social_category: personal?.category || null,
    occupation: business?.businessActivity || null,
    business_type: business?.businessType || null,
    business_stage: business?.businessStage || null,
    years_in_business: business?.yearsInBusiness || null,
    annual_turnover: business?.annualTurnover || null,
    number_of_employees: business?.numberOfEmployees || null,
    annual_income: other?.annualIncome || null,
    registered_business: other?.registeredBusiness || null,
    funding_required: other?.fundingRequired || null,
    preferred_support: other?.preferredSupport || null,
    interested_scheme_type: other?.interestedSchemeType || null,
  };
}

/* ====== COMPONENT ====== */

export default function MatchingSchemesPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error | needs-profile

  /* ===== LOAD SAVED USER INFORMATION ======= */

  const personalDetails = getLocalStorageData("schemeSaathiPersonalDetails");
  const businessDetails = getLocalStorageData("schemeSaathiBusinessDetails");
  const otherDetails = getLocalStorageData("schemeSaathiOtherDetails");

  /* ===== FETCH REAL MATCHES FROM THE AI MATCHING ENGINE ======= */

  const loadMatches = async () => {
    const hasProfile = Boolean(
      personalDetails?.phoneNumber ||
      personalDetails?.state ||
      personalDetails?.category ||
      businessDetails?.businessType ||
      businessDetails?.businessActivity
    );

    if (!hasProfile) {
      setStatus("needs-profile");
      return;
    }

    setStatus("loading");

    try {
      const payload = buildProfilePayload(personalDetails, businessDetails, otherDetails);
      const result = await fetchMatchingSchemes(payload);
      if (result.error) throw new Error(result.error);
      setMatches(result.matches || []);
      setStatus("ready");
    } catch (error) {
      console.error("Unable to fetch matching schemes:", error);
      setStatus("error");
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  /* ====== SEARCH ======== */

  const filteredSchemes = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return matches;

    return matches.filter((scheme) => {
      return (
        (scheme.name || scheme.scheme_name || "").toLowerCase().includes(searchText) ||
        (scheme.department || "").toLowerCase().includes(searchText) ||
        (scheme.description || "").toLowerCase().includes(searchText) ||
        (scheme.benefits || "").toLowerCase().includes(searchText)
      );
    });
  }, [matches, search]);

  /* ======= VIEW SCHEME ========= */

  const handleViewScheme = (scheme) => {
    if (scheme.official_source_url) {
      window.open(scheme.official_source_url, "_blank", "noopener,noreferrer");
    } else {
      alert("An official source link isn't available for this scheme yet.");
    }
  };

  /* ======== EDIT PROFILE ====== */

  const handleEdit = (section) => {
    sessionStorage.setItem("schemeSaathiEditMode", section);

    if (section === "personal") {
      window.location.href = "/find-schemes/personal-info";
      return;
    }

    if (section === "business") {
      window.location.href = "/find-schemes/business-details";
      return;
    }

    if (section === "other") {
      window.location.href = "/find-schemes/other-details";
    }
  };

  /* ======== RENDER ======= */

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        {/* ====== PROGRESS ======= */}

        <ProgressSteps currentStep={5} />

        <div className="mx-auto max-w-300 px-5 sm:px-8">
          {/* ====== HEADER ========= */}

          <div className="pt-9">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="mb-2 inline-flex items-center rounded-full bg-[#fff4c7] px-3 py-1 text-[11px] font-semibold text-[#9b7815]">
                  {t("Step 5 • Results")}</div>

                <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-[#172b49]">
                  {t("results_title")}
                </h1>

                <p className="mt-2 max-w-170 text-[14px] leading-6 text-slate-500">
                  {t("results_subtitle")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <p className="text-[11px] font-medium text-slate-400">{t("MATCHED SCHEMES")}</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0d2b55]">
                  {status === "ready" ? filteredSchemes.length : "–"}
                </p>
              </div>
            </div>
          </div>

          {/* ====== PROFILE SUMMARY ======== */}

          {status !== "needs-profile" && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-[#172b49]">{t("Your application profile")}</h2>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {personalDetails?.state && <ProfileTag>{personalDetails.state}</ProfileTag>}
                    {personalDetails?.category && <ProfileTag>{personalDetails.category}</ProfileTag>}
                    {businessDetails?.businessType && <ProfileTag>{businessDetails.businessType}</ProfileTag>}
                    {businessDetails?.businessStage && <ProfileTag>{businessDetails.businessStage}</ProfileTag>}
                    {otherDetails?.preferredSupport && <ProfileTag>{otherDetails.preferredSupport}</ProfileTag>}
                    {otherDetails?.interestedSchemeType && <ProfileTag>{otherDetails.interestedSchemeType}</ProfileTag>}
                  </div>
                </div>

                {/* EDIT BUTTONS */}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit("personal")}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] font-medium text-[#0d2b55] transition hover:bg-slate-50"
                  >
                    {t("Personal")}</button>

                  <button
                    type="button"
                    onClick={() => handleEdit("business")}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] font-medium text-[#0d2b55] transition hover:bg-slate-50"
                  >
                    {t("Business")}</button>

                  <button
                    type="button"
                    onClick={() => handleEdit("other")}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] font-medium text-[#0d2b55] transition hover:bg-slate-50"
                  >
                    {t("Other")}</button>
                </div>
              </div>
            </section>
          )}

          {/* ====== SEARCH ONLY ======== */}

          {status === "ready" && (
            <section className="mt-6">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Search schemes...")}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] text-slate-700 outline-none transition focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
                />
              </div>
            </section>
          )}

          {/* ====== RESULTS ======== */}

          <div className="mt-6">
            {status === "needs-profile" && (
              <StatusMessage
                title={t("Let's get a few details first")}
                body={t("To find schemes matched to you, we need your basic profile. It only takes a couple of minutes.")}
                action={{ label: "Start Profile", href: "/find-schemes/personal-info" }}
              />
            )}

            {status === "loading" && <StatusMessage title={t("Checking your eligibility...")} body={t("This takes a few seconds while we run every scheme's rules against your profile.")} />}

            {status === "error" && (
              <StatusMessage
                title={t("We couldn't fetch your matches")}
                body={t("Please check your internet connection and try again. If the problem continues, please try again in a few minutes.")}
                onRetry={loadMatches}
              />
            )}

            {status === "ready" && filteredSchemes.length === 0 && (
              <EmptyResults onReset={() => setSearch("")} />
            )}

            {status === "ready" && filteredSchemes.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredSchemes.map((scheme, idx) => (
                  <SchemeCard key={`${scheme.scheme_id || scheme.name}-${idx}`} scheme={scheme} onView={() => handleViewScheme(scheme)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ====== SCHEME CARD ====== */

function SchemeCard({ scheme, onView }) {
  const { t } = useLanguage();
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* TOP */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0d2b55] text-lg font-bold text-[#f4c63d]">
            ₹
          </div>

          <div>
            <h2 className="text-[16px] font-bold leading-5 text-[#172b49]">{scheme.name || scheme.scheme_name}</h2>
            <p className="mt-1 text-[11px] text-slate-400">{scheme.department}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-[#fff5c9] px-2.5 py-1 text-[10px] font-semibold text-[#8c6b00]">
            {Math.round(scheme.score * 100)}{t("% recorded checks")}</span>
          {scheme.confidence && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600">
              {t("Preliminary screening")}</span>
          )}
        </div>
      </div>

      {/* MATCHED CRITERIA PILLS */}
      {scheme.matched_conditions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {scheme.matched_conditions.map((cond) => (
            <span key={cond} className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              ✓ {cond}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-amber-800">{t("Preliminary screening only. Verify all conditions and current availability on the official portal.")}</p>
      {/* DESCRIPTION */}

      <p className="mt-4 text-[12px] leading-5 text-slate-500">{scheme.description}</p>

      {/* BENEFITS */}

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("Benefits")}</p>
        <p className="mt-1 text-[14px] font-bold text-[#172b49]">{scheme.benefits}</p>
      </div>

      {/* REQUIRED DOCUMENTS */}

      {scheme.required_documents?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {scheme.required_documents.map((doc) => (
            <span key={doc} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
              {doc}
            </span>
          ))}
        </div>
      )}

      {/* WHY THIS MATCHED -- the explainability the SIH brief asks for */}

      <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2">
        <p className="text-[11px] font-semibold text-emerald-700">{t("✓ Why this was suggested")}</p>
        <p className="mt-1 text-[11px] leading-5 text-emerald-800">{scheme.explanation}</p>
      </div>

      {/* APPLICATION ROUTE */}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-[#172b49]">{t("How to apply")}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{scheme.application_route}</p>
      </div>

      {/* BUTTON */}

      <button
        type="button"
        onClick={onView}
        className="mt-5 h-10 w-full rounded-lg bg-[#0d2b55] text-[12px] font-semibold text-white transition hover:bg-[#173b70] active:scale-[0.99]"
      >
        {t("Visit Official Scheme Page ↗")}</button>
    </article>
  );
}

/* ====== PROFILE TAG ====== */

function ProfileTag({ children }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">{children}</span>;
}

/* ====== STATUS MESSAGE (loading / error / needs-profile) ====== */

function StatusMessage({ title, body, action, onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <h2 className="mt-4 text-lg font-bold text-[#172b49]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-500">{body}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-block rounded-lg bg-[#0d2b55] px-5 py-2.5 text-[12px] font-medium text-white hover:bg-[#173b70] active:scale-95 transition"
        >
          {t("🔄 Retry Fetching Matches")}</button>
      )}

      {action && (
        <a
          href={action.href}
          className="mt-5 inline-block rounded-lg bg-[#0d2b55] px-5 py-2.5 text-[12px] font-medium text-white hover:bg-[#173b70]"
        >
          {action.label} →
        </a>
      )}
    </div>
  );
}

/* ====== EMPTY RESULTS ====== */

function EmptyResults({ onReset }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">🔎</div>

      <h2 className="mt-4 text-lg font-bold text-[#172b49]">{t("No schemes found")}</h2>

      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-500">
        {t("We couldn't find schemes matching your search. Try another keyword, or none of the current schemes may fit your profile yet.")}</p>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-lg bg-[#0d2b55] px-5 py-2.5 text-[12px] font-medium text-white hover:bg-[#173b70]"
      >
        {t("Clear Search")}</button>
    </div>
  );
}
