import React, { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import { useLanguage } from "../../lib/i18n.jsx";
import { getUserItem } from "../../lib/userStorage";

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [business, setBusiness] = useState(null);
  const [other, setOther] = useState(null);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("schemeSaathiLoggedIn") === "true";
    if (!isLoggedIn) {
      window.location.href = "/signin";
      return;
    }

    setUser(readJSON("schemeSaathiUser"));
    setPersonal(getUserItem("schemeSaathiPersonalDetails"));
    setBusiness(getUserItem("schemeSaathiBusinessDetails"));
    setOther(getUserItem("schemeSaathiOtherDetails"));
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem("schemeSaathiLoggedIn");
    sessionStorage.removeItem("schemeSaathiToken");
    sessionStorage.removeItem("schemeSaathiUser");
    window.location.href = "/";
  };

  if (!user && !personal) {
    return (
      <MainLayout>
        <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] py-16 text-center">
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        <div className="mx-auto max-w-4xl px-5 pt-10 sm:px-8">

          {/* HEADER CARD */}

          <section className="flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d2b55] text-xl font-bold text-white">
                {(personal?.fullName || user?.fullName || "?").trim().charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 className="text-lg font-bold text-[#172b49]">
                  {personal?.fullName || user?.fullName || "Your Profile"}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {personal?.phoneNumber || user?.mobile || "No mobile number on file"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              {t("sign_out")}
            </button>
          </section>

          {/* PERSONAL DETAILS */}

          <ProfileSection title="Personal Details" editHref="/find-schemes/personal-info" editSection="personal">
            {personal ? (
              <FieldGrid
                fields={[
                  ["Age", personal.age],
                  ["Gender", personal.gender],
                  ["Social Category", personal.category],
                  ["State", personal.state],
                  ["District / City", personal.district],
                ]}
              />
            ) : (
              <EmptyNote text="You haven't completed the Find Schemes profile yet." href="/find-schemes/personal-info" cta="Start Now" />
            )}
          </ProfileSection>

          {/* BUSINESS DETAILS */}

          <ProfileSection title="Business Details" editHref="/find-schemes/business-details" editSection="business">
            {business ? (
              <FieldGrid
                fields={[
                  ["Business Type", business.businessType],
                  ["Business Stage", business.businessStage],
                  ["Years in Business", business.yearsInBusiness],
                  ["Annual Turnover", business.annualTurnover],
                  ["Number of Employees", business.numberOfEmployees],
                ]}
              />
            ) : (
              <EmptyNote text="No business details saved yet." href="/find-schemes/business-details" cta="Add Details" />
            )}
          </ProfileSection>

          {/* OTHER DETAILS */}

          <ProfileSection title="Other Details" editHref="/find-schemes/other-details" editSection="other">
            {other ? (
              <FieldGrid
                fields={[
                  ["Annual Income", other.annualIncome],
                  ["Registered Business", other.registeredBusiness],
                  ["Funding Required", other.fundingRequired],
                  ["Preferred Support", other.preferredSupport],
                  ["Interested Scheme Type", other.interestedSchemeType],
                ]}
              />
            ) : (
              <EmptyNote text="No additional details saved yet." href="/find-schemes/other-details" cta="Add Details" />
            )}
          </ProfileSection>

          {personal?.phoneNumber && (
            <div className="mt-6 text-center">
              <a
                href="/find-schemes/matching-schemes"
                className="inline-block rounded-lg bg-[#0d2b55] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#173b70]"
              >
                View My Matched Schemes →
              </a>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}

function ProfileSection({ title, editHref, editSection, children }) {
  const { t } = useLanguage();
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#172b49]">{title}</h2>

        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("schemeSaathiEditMode", editSection);
            window.location.href = editHref;
          }}
          className="text-xs font-medium text-[#0d2b55] hover:underline"
        >
          {t("common_edit")}
        </button>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldGrid({ fields }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-sm text-slate-700">{value || "Not provided"}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyNote({ text, href, cta }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-500">
      {text}{" "}
      <a href={href} className="font-medium text-[#0d2b55] hover:underline">
        {cta} →
      </a>
    </div>
  );
}
