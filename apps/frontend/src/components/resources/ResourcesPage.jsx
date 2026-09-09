import React, { useMemo, useState } from "react";
import { MainLayout } from "../layout";

/* ====== ENRICHED RESOURCE DATA ====== */

const resources = [
  {
    id: 1,
    title: "How to Find the Right Government Scheme",
    url: "https://www.myscheme.gov.in/",
    category: "Guides",
    icon: "📚",
    description:
      "Learn how to identify government schemes based on your business, income, location and support requirements.",
    type: "Guide",
    details: {
      summary: "Navigating hundreds of schemes can be overwhelming. Follow these steps to find schemes tailored to your profile.",
      steps: [
        { title: "Define Your Business Category", text: "Identify whether your unit falls under Micro, Small, Medium Enterprise, Agriculture, Handicraft, or Self-Employment." },
        { title: "Check Social & Gender Quotas", text: "Many schemes offer 15%-35% higher subsidies or priority processing for Women, SC/ST, Minority, and Differently-Abled entrepreneurs." },
        { title: "Verify Regional Eligibility", text: "State-specific schemes often supplement Central schemes. Ensure your district and state are eligible." },
        { title: "Use SchemeSaathi AI Matching", text: "Input your profile details into our AI matcher to instantly shortlist relevant schemes." }
      ]
    }
  },
  {
    id: 2,
    title: "How to Apply for a Government Scheme",
    url: "https://www.myscheme.gov.in/",
    category: "Application",
    icon: "📝",
    description:
      "A simple step-by-step guide explaining the general process of applying for government schemes.",
    type: "Guide",
    details: {
      summary: "Most central and state schemes follow a standardized application lifecycle. Here is your roadmap.",
      steps: [
        { title: "Step 1: Scheme Selection & Reading Guidelines", text: "Read the official scheme guidelines carefully to verify eligibility and required documents." },
        { title: "Step 2: Digital Profile & Udyam Registration", text: "Register on the official scheme portal or JanSamarth / MyScheme portal using your Aadhaar-linked mobile number." },
        { title: "Step 3: Document Preparation", text: "Scan all required identity, business, and financial documents in PDF/JPEG format." },
        { title: "Step 4: Form Submission & DPR Upload", text: "Fill out the online application and upload Detailed Project Reports (DPR) if applicable." },
        { title: "Step 5: Application Tracking & Bank Approval", text: "Note down your Application Tracking ID to check status regularly on the official portal." }
      ]
    }
  },
  {
    id: 3,
    title: "Documents Required for Scheme Applications",
    url: "https://www.digilocker.gov.in/",
    category: "Documents",
    icon: "📄",
    description:
      "Understand the commonly required documents such as identity proof, address proof and business documents.",
    type: "Checklist",
    details: {
      summary: "Keep digital copies of these essential documents ready before beginning any application.",
      checklistItems: [
        "Aadhaar Card (linked with active mobile number for OTP verification)",
        "PAN Card (Individual PAN & Business PAN if registered entity)",
        "Address Proof (Electricity bill / Rent Agreement / Land records)",
        "Caste / Social Category Certificate (issued by competent authority if applicable)",
        "Udyam / MSME Registration Certificate",
        "Bank Passbook or Cancelled Cheque (showing Account Number & IFSC Code)",
        "Income Certificate or last 1-3 years Income Tax Returns (ITR)",
        "Detailed Project Report (DPR) or Business Plan summary"
      ]
    }
  },
  {
    id: 4,
    title: "Frequently Asked Questions",
    url: "https://www.myscheme.gov.in/",
    category: "FAQs",
    icon: "❓",
    description:
      "Find answers to common questions about eligibility, applications, benefits and government schemes.",
    type: "FAQ",
    details: {
      summary: "Quick answers to the most common queries asked by scheme applicants.",
      faqs: [
        { q: "Can I apply for multiple government schemes simultaneously?", a: "Yes, you can apply for multiple schemes as long as they do not provide duplicate subsidies for the exact same capital expenditure." },
        { q: "Is collateral required for MSME government loans?", a: "Under schemes like CGTMSE and PM MUDRA, collateral-free loans up to Rs 10 Lakhs (Mudra) and up to Rs 2 Crores (CGTMSE) are available." },
        { q: "How long does scheme application processing take?", a: "Processing times vary from 2 to 6 weeks depending on bank verification, document scrutiny, and department approvals." },
        { q: "What if my application gets rejected?", a: "Most portals provide rejection reasons. You can rectify document errors or update missing details and re-apply." }
      ]
    }
  },
  {
    id: 5,
    title: "Tips to Improve Scheme Eligibility",
    url: "https://www.myscheme.gov.in/",
    category: "Tips",
    icon: "💡",
    description:
      "Useful tips to understand eligibility requirements and prepare better before applying.",
    type: "Tips",
    details: {
      summary: "Boost your application approval chances by following these expert recommendations.",
      tipsList: [
        "Ensure exact name match across Aadhaar, PAN, Bank Account, and Udyam Certificate.",
        "Link your Aadhaar card with an active mobile number to ensure seamless e-KYC e-signing.",
        "Obtain Udyam Registration—it is completely free and unlocks maximum priority lending benefits.",
        "Prepare a clean Detailed Project Report (DPR) highlighting expected sales, costs, and employment generated.",
        "Maintain a healthy personal or business bank account record with active transactions."
      ]
    }
  },
  {
    id: 6,
    title: "Understanding Business Loans & Subsidies",
    url: "https://www.jansamarth.in/",
    category: "Guides",
    icon: "💰",
    description:
      "Understand the difference between government loans, subsidies, grants and other forms of financial support.",
    type: "Article",
    details: {
      summary: "Government financial support comes in different forms. Understanding these terms helps you choose the right financial product.",
      sections: [
        { title: "Capital Subsidy / Margin Money", text: "A non-refundable percentage (e.g. 15% - 35% under PMEGP) credited to your loan account by the government, reducing your total repayable loan amount." },
        { title: "Interest Subvention / Rebate", text: "The government pays a portion of your loan interest (e.g., 2% - 3% subvention under Mudra or Agri Infrastructure Fund), lowering your EMI." },
        { title: "Collateral-Free Bank Loans", text: "Loans guaranteed by government trust funds (e.g., CGTMSE) so you don't need to pledge land or assets as security." },
        { title: "Direct Grants & Stipends", text: "Direct financial transfers to support skill training, prototype development, or seed stage testing." }
      ]
    }
  },
  {
    id: 7,
    title: "MSME Registration Guide (Udyam)",
    url: "https://udyamregistration.gov.in/",
    category: "Application",
    icon: "🏭",
    description:
      "Learn about MSME registration and why registration can be useful for eligible businesses.",
    type: "Guide",
    details: {
      summary: "Udyam Registration is mandatory to claim MSME subsidies, lower electricity tariffs, and priority sector lending.",
      steps: [
        { title: "1. Official Portal", text: "Visit official site: udyamregistration.gov.in (Beware of fraud paid sites; Udyam is 100% FREE)." },
        { title: "2. Aadhaar Verification", text: "Enter proprietor/partner/director Aadhaar number and validate with OTP." },
        { title: "3. Enterprise Details", text: "Enter business name, type of organization, plant address, and bank account details." },
        { title: "4. Income & Investment", text: "Provide investment in plant/machinery and turnover details (auto-fetched if ITR filed)." },
        { title: "5. Certificate Generation", text: "Submit and receive your permanent Udyam Registration Certificate with QR Code." }
      ]
    }
  },
  {
    id: 8,
    title: "Startup Support Resources",
    url: "https://www.startupindia.gov.in/",
    category: "Guides",
    icon: "🚀",
    description:
      "Explore useful information about startup funding, innovation support and government programs.",
    type: "Guide",
    details: {
      summary: "Government initiatives to turn innovative ideas into scalable commercial enterprises.",
      sections: [
        { title: "DPIIT Recognition", text: "Get recognized as a startup by DPIIT to access tax exemptions under Section 80-IAC and self-certification under labor laws." },
        { title: "Startup India Seed Fund Scheme (SISFS)", text: "Financial assistance up to Rs 20 Lakhs as grant for proof of concept/validation and up to Rs 50 Lakhs via convertible debentures." },
        { title: "Patent & IPR Fast-Tracking", text: "80% rebate on patent filing fees and 50% rebate on trademark filings with fast-track examination." }
      ]
    }
  },
  {
    id: 9,
    title: "Government Scheme Application Checklist",
    url: "https://www.myscheme.gov.in/",
    category: "Documents",
    icon: "✅",
    description:
      "Use this checklist to prepare important information and documents before starting an application.",
    type: "Checklist",
    details: {
      summary: "Run through this quick verification list before submitting your scheme application form.",
      checklistItems: [
        "Verified personal profile (Age, Gender, Social Category, Annual Household Income)",
        "Valid Udyam / GST / Shop License number if applying for a business loan",
        "Clear project cost estimate and quotation for machinery/equipment",
        "Bank account active with e-KYC updated and linked to Aadhaar",
        "Mobile number active and accessible to receive OTP e-signatures",
        "Digital PDF copies of all documents stored under 2MB size limit"
      ]
    }
  },
  {
    id: 10,
    title: "Avoid Common Application Mistakes",
    url: "https://www.myscheme.gov.in/",
    category: "Tips",
    icon: "⚠️",
    description:
      "Learn about common mistakes applicants make and how to avoid delays or incomplete applications.",
    type: "Tips",
    details: {
      summary: "Avoid these top 5 mistakes that result in rejected or delayed scheme applications.",
      tipsList: [
        "Name Mismatch: Spelling variations between Aadhaar, PAN, and Bank passbook cause e-KYC failure.",
        "Wrong Social Category: Uploading outdated or non-competent authority caste certificates.",
        "Incorrect Bank IFSC Code: Using outdated IFSC codes after bank mergers delays Direct Benefit Transfers.",
        "Unrealistic DPR Estimates: Projecting inflated revenues without supporting market quotes leads to loan rejection.",
        "Applying on Unofficial Third-Party Websites: Always verify portal URL ends with .gov.in or .in."
      ]
    }
  },
  {
    id: 11,
    title: "Scheme Eligibility Explained",
    url: "https://www.myscheme.gov.in/",
    category: "FAQs",
    icon: "🔍",
    description:
      "Understand how eligibility conditions such as age, income, category and business type can affect applications.",
    type: "FAQ",
    details: {
      summary: "Understand how eligibility criteria are evaluated by government algorithms and screening committees.",
      faqs: [
        { q: "Why is age criteria enforced?", a: "Most business loan schemes require applicants to be at least 18 years old to execute legal loan contracts." },
        { q: "How is annual income verified?", a: "Income is cross-checked using ITR records, Ration Card classification (BPL/APL), or Tehsildar income certificates." },
        { q: "Do existing business owners qualify for new unit schemes?", a: "Certain schemes like PMEGP are strictly for setting up fresh new micro-enterprises. Existing units can explore expansion schemes like MUDRA or CGTMSE." }
      ]
    }
  },
  {
    id: 12,
    title: "Financial Assistance Explained",
    url: "https://www.jansamarth.in/",
    category: "Guides",
    icon: "💳",
    description:
      "Learn how different forms of government financial assistance can support individuals and businesses.",
    type: "Article",
    details: {
      summary: "A complete guide on how financial assistance is disbursed to beneficiaries.",
      sections: [
        { title: "Direct Benefit Transfer (DBT)", text: "Subsidies transferred directly to your Aadhaar-seeded bank account without any intermediaries." },
        { title: "Margin Money Disbursement", text: "Subsidy amount kept in a lock-in Term Deposit (TDR) by bank for 3 years, after which it adjusts against your loan principal." },
        { title: "Skill Stipends", text: "Daily or monthly allowance paid directly into your bank during approved government vocational training programs." }
      ]
    }
  }
];

/* ====== RESOURCE CATEGORIES ====== */

const resourceCategories = [
  "All",
  "Guides",
  "Application",
  "Documents",
  "FAQs",
  "Tips",
];

/* ====== MAIN PAGE ====== */

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeModalResource, setActiveModalResource] = useState(null);

  /* ====== FILTER RESOURCES ====== */

  const filteredResources = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesCategory =
        category === "All" || resource.category === category;

      const matchesSearch =
        !searchText ||
        resource.title.toLowerCase().includes(searchText) ||
        resource.description.toLowerCase().includes(searchText) ||
        resource.category.toLowerCase().includes(searchText) ||
        resource.type.toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  /* ====== OPEN RESOURCE ====== */

  const handleOpenResource = (resource) => {
    localStorage.setItem(
      "schemeSaathiSelectedResource",
      JSON.stringify(resource)
    );
    setActiveModalResource(resource);
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        {/*==== HERO ===== */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-300 px-5 py-12 sm:px-8">
            <div className="mx-auto max-w-190 text-center">
              <div className="mx-auto mb-3 inline-flex items-center rounded-full bg-[#fff4c7] px-3.5 py-1 text-[11px] font-bold text-[#9b7815]">
                📚 SchemeSaathi Knowledge Base & Resource Centre
              </div>

              <h1 className="text-[30px] font-extrabold tracking-tight text-[#172b49] sm:text-[36px]">
                Learn Before You Apply
              </h1>

              <p className="mx-auto mt-3 max-w-170 text-[14px] leading-6 text-slate-500">
                Explore helpful step-by-step guides, document checklists, FAQs, and application tips to maximize your scheme approval success.
              </p>
            </div>

            {/* ================= SEARCH ================= */}
            <div className="mx-auto mt-8 max-w-162.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  ⌕
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources (e.g. Udyam, Documents, Checklist, Loan, Tips)..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-[13px] text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
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
          </div>
        </section>

        {/* ====== MAIN CONTENT ====== */}
        <main className="mx-auto max-w-300 px-5 sm:px-8">
          {/* ================= HEADER ================= */}
          <div className="flex flex-col gap-4 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#172b49]">
                Knowledge Resources ({filteredResources.length})
              </h2>
              <p className="mt-1 text-[12px] text-slate-500">
                Click any resource guide to view detailed step-by-step instructions and official links.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-[#0d2b55] shadow-xs">
              {filteredResources.length} Verified Guides Available
            </div>
          </div>

          {/* ====== CATEGORY FILTER ====== */}
          <div className="mb-6 flex flex-wrap gap-2">
            {resourceCategories.map((item) => {
              const active = category === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-4 py-2 text-[11px] font-medium transition ${
                    active
                      ? "bg-[#0d2b55] text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* ====== RESOURCE GRID ====== */}
          {filteredResources.length === 0 ? (
            <EmptyResources
              onReset={() => {
                setSearch("");
                setCategory("All");
              }}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={() => handleOpenResource(resource)}
                />
              ))}
            </div>
          )}

          {/* ====== QUICK HELP SECTION ====== */}
          <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d2b55] text-lg text-white">
                    💡
                  </div>
                  <h2 className="text-[16px] font-bold text-[#172b49]">
                    Need Personalized Scheme Matching?
                  </h2>
                </div>
                <p className="mt-2 max-w-162.5 text-[12px] leading-5 text-slate-500">
                  Use SchemeSaathi AI to provide your basic profile details (category, state, business type) and instantly discover schemes you qualify for.
                </p>
              </div>

              <a
                href="/find-schemes"
                className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#0d2b55] px-5 text-[12px] font-semibold text-white transition hover:bg-[#173b70]"
              >
                Find Matching Schemes →
              </a>
            </div>
          </section>
        </main>
      </div>

      {/* ====== RESOURCE DETAIL MODAL ====== */}
      {activeModalResource && (
        <ResourceDetailModal
          resource={activeModalResource}
          onClose={() => setActiveModalResource(null)}
        />
      )}
    </MainLayout>
  );
}

/* ====== RESOURCE CARD ====== */

function ResourceCard({ resource, onOpen }) {
  return (
    <article
      onClick={onOpen}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#d7aa2d] hover:shadow-md cursor-pointer"
    >
      <div>
        {/* TOP */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0d2b55] text-2xl shadow-xs transition group-hover:scale-105">
            {resource.icon}
          </div>

          <span className="rounded-full bg-[#fff5c9] px-3 py-1 text-[11px] font-bold text-[#8c6b00]">
            {resource.type}
          </span>
        </div>

        {/* TITLE */}
        <h3 className="mt-5 text-[17px] font-bold leading-6 text-[#172b49] transition-colors group-hover:text-[#0d2b55]">
          {resource.title}
        </h3>

        {/* CATEGORY */}
        <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#d8aa2d]">
          {resource.category}
        </p>

        {/* DESCRIPTION */}
        <p className="mt-3 text-[12px] leading-5 text-slate-500">
          {resource.description}
        </p>
      </div>

      {/* BUTTON */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="flex h-9.5 w-full items-center justify-center rounded-lg bg-[#0d2b55] text-[12px] font-semibold text-white transition hover:bg-[#173b70] active:scale-[0.99]"
        >
          Read Resource Guide →
        </button>
      </div>
    </article>
  );
}

/* ====== RESOURCE DETAIL MODAL ====== */

function ResourceDetailModal({ resource, onClose }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (idx) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
      <div className="flex h-[88vh] max-h-180 w-full max-w-220 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0d2b55] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{resource.icon}</span>
            <div>
              <span className="rounded-full bg-[#fff5c9] px-2.5 py-0.5 text-[10px] font-bold text-[#8c6b00]">
                {resource.type} • {resource.category}
              </span>
              <h3 className="mt-1 text-[17px] font-bold tracking-tight text-white">
                {resource.title}
              </h3>
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

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#fdfdfd] space-y-6">
          {resource.details?.summary && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-[13px] leading-6 text-slate-700">
              <strong className="font-bold text-[#0d2b55]">Overview: </strong>
              {resource.details.summary}
            </div>
          )}

          {/* STEPS (if guide) */}
          {resource.details?.steps && (
            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#172b49]">Step-by-Step Walkthrough</h4>
              <div className="space-y-3">
                {resource.details.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0d2b55] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="text-[13px] font-bold text-[#172b49]">{step.title}</h5>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHECKLIST ITEMS (if checklist) */}
          {resource.details?.checklistItems && (
            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#172b49]">Interactive Document Checklist</h4>
              <p className="text-[11px] text-slate-500">Check off documents as you assemble them:</p>
              <div className="space-y-2">
                {resource.details.checklistItems.map((item, idx) => (
                  <label
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-[12px] transition cursor-pointer ${
                      checkedItems[idx]
                        ? "border-emerald-300 bg-emerald-50/60 text-emerald-900 line-through"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0d2b55] focus:ring-[#0d2b55]"
                    />
                    <span className="leading-5">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* FAQS (if FAQ) */}
          {resource.details?.faqs && (
            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#172b49]">Frequently Asked Questions</h4>
              <div className="space-y-3">
                {resource.details.faqs.map((faq, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <h5 className="text-[13px] font-bold text-[#0d2b55]">Q: {faq.q}</h5>
                    <p className="mt-2 text-[12px] leading-5 text-slate-600">A: {faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTIONS / TIPS LIST */}
          {resource.details?.sections && (
            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#172b49]">Detailed Breakdown</h4>
              <div className="space-y-3">
                {resource.details.sections.map((sec, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                    <h5 className="text-[13px] font-bold text-[#172b49]">{sec.title}</h5>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">{sec.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resource.details?.tipsList && (
            <div className="space-y-3">
              <h4 className="text-[14px] font-bold text-[#172b49]">Pro Tips & Guidance</h4>
              <div className="space-y-2.5">
                {resource.details.tipsList.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-[12px] text-slate-700 shadow-xs">
                    <span className="text-amber-500 text-base">💡</span>
                    <span className="leading-5">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close Guide
          </button>

          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-[#0d2b55] px-5 py-2 text-[12px] font-bold text-white transition hover:bg-[#173b70]"
            >
              Open Official Government Portal ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====== EMPTY STATE ====== */

function EmptyResources({ onReset }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🔎
      </div>

      <h2 className="mt-4 text-lg font-bold text-[#172b49]">No resources found</h2>

      <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-slate-500">
        We couldn't find any resource matching your search or selected category filter.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-lg bg-[#0d2b55] px-5 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#173b70]"
      >
        Clear Filters & Search
      </button>
    </div>
  );
}