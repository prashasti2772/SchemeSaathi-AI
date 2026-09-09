import React, { useState } from "react";
import { useLanguage } from "../../lib/i18n.jsx";
import ProgressSteps from "./ProgressSteps";
import WhyAskCard from "./WhyAskCard";
import { MainLayout } from "../layout";
import { getUserItem, setUserItem } from "../../lib/userStorage";

const initialForm = {
  annualIncome: "",
  registeredBusiness: "",
  fundingRequired: "",
  preferredSupport: "",
  previousScheme: "",
  interestedSchemeType: "",
};

const incomeOptions = [
  "Below ₹1 Lakh",
  "₹1 - ₹3 Lakh",
  "₹3 - ₹5 Lakh",
  "₹5 - ₹10 Lakh",
  "₹10 - ₹25 Lakh",
  "Above ₹25 Lakh",
];

const fundingOptions = [
  "Below ₹50,000",
  "₹50,000 - ₹1 Lakh",
  "₹1 - ₹5 Lakh",
  "₹5 - ₹10 Lakh",
  "₹10 - ₹25 Lakh",
  "Above ₹25 Lakh",
];

const supportOptions = [
  "Loan",
  "Subsidy",
  "Grant",
  "Not sure yet",
];

const schemeTypeOptions = [
  "Financial Assistance",
  "Business Loan",
  "Subsidy",
  "Grant",
  "Training",
  "Skill Development",
  "Marketing Support",
  "Infrastructure Support",
];

function loadOtherData() {
  const saved = getUserItem("schemeSaathiOtherDetails");
  return saved ? { ...initialForm, ...saved } : { ...initialForm };
}

export default function OtherDetailsPage() {
  const { t } = useLanguage();
  const editMode =
    sessionStorage.getItem("schemeSaathiEditMode");

  const isEditMode = editMode === "other";

  // Always start from this account's saved answers, if any.
  const [form, setForm] = useState(loadOtherData);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinue = (e) => {
    e.preventDefault();

    if (
      !form.annualIncome ||
      !form.registeredBusiness ||
      !form.fundingRequired ||
      !form.preferredSupport ||
      !form.previousScheme ||
      !form.interestedSchemeType
    ) {
      alert("Please complete all the details.");
      return;
    }

    setUserItem("schemeSaathiOtherDetails", form);

    sessionStorage.removeItem("schemeSaathiEditMode");

    window.location.assign("/find-schemes/review");
  };

  const handleBack = () => {
    if (isEditMode) {
      sessionStorage.removeItem("schemeSaathiEditMode");
      window.location.assign("/find-schemes/review");
    } else {
      window.location.assign("/find-schemes/business-details");
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        <ProgressSteps currentStep={3} />

        <div className="mx-auto max-w-287.5 px-5 sm:px-8">
          <div className="mt-9">
            <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-[#172b49]">
              Almost there! A few more details
            </h1>

            {isEditMode && (
              <p className="mt-2 text-[13px] text-slate-500">
                Update your information below.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_330px]">
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-6">
              <form
                id="other-form"
                onSubmit={handleContinue}
              >
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <FormSelect
                    label="Annual Income"
                    name="annualIncome"
                    placeholder="Select Income Range"
                    value={form.annualIncome}
                    onChange={handleChange}
                    options={incomeOptions}
                  />

                  <FormSelect
                    label="Registered Business?"
                    name="registeredBusiness"
                    placeholder="Yes / No"
                    value={form.registeredBusiness}
                    onChange={handleChange}
                    options={["Yes", "No"]}
                  />

                  <FormSelect
                    label="Funding Required"
                    name="fundingRequired"
                    placeholder="Select Amount Range"
                    value={form.fundingRequired}
                    onChange={handleChange}
                    options={fundingOptions}
                  />

                  <FormSelect
                    label="Preferred Support"
                    name="preferredSupport"
                    placeholder="Loan / Subsidy / Grant"
                    value={form.preferredSupport}
                    onChange={handleChange}
                    options={supportOptions}
                  />

                  <FormSelect
                    label="Previous government scheme?"
                    name="previousScheme"
                    placeholder="Yes / No"
                    value={form.previousScheme}
                    onChange={handleChange}
                    options={["Yes", "No"]}
                  />

                  <FormSelect
                    label="Interested Scheme Type"
                    name="interestedSchemeType"
                    placeholder="Select Type"
                    value={form.interestedSchemeType}
                    onChange={handleChange}
                    options={schemeTypeOptions}
                  />
                </div>
              </form>
            </section>

            <WhyAskCard />
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-8 text-[13px] font-medium text-[#0d2b55] hover:bg-slate-50 sm:w-37.5"
            >
              ← {t("common_back")}
            </button>

            <button
              type="submit"
              form="other-form"
              className="h-11 w-full rounded-lg bg-[#0d2b55] px-8 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#173b70] sm:w-58"
            >
              {t("common_continue")} →
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function FormSelect({
  label,
  name,
  placeholder,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] outline-none focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10 ${
          value ? "text-slate-700" : "text-slate-400"
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}