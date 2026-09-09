import React, { useState } from "react";
import { useLanguage } from "../../lib/i18n.jsx";
import ProgressSteps from "./ProgressSteps";
import WhyAskCard from "./WhyAskCard";
import { MainLayout } from "../layout";
import { getUserItem, setUserItem } from "../../lib/userStorage";

const initialForm = {
  businessType: "",
  businessActivity: "",
  businessStage: "",
  yearsInBusiness: "",
  annualTurnover: "",
  numberOfEmployees: "",
};

const businessTypes = [
  "Manufacturing",
  "Service",
  "Trading",
  "Agriculture",
  "Retail",
  "Other",
];

const businessStages = [
  "Idea / Planning",
  "Startup",
  "Early Stage",
  "Established",
  "Expansion",
];

const yearsOptions = [
  "Less than 1 year",
  "1 - 3 years",
  "3 - 5 years",
  "5 - 10 years",
  "More than 10 years",
];

const turnoverOptions = [
  "Below ₹1 Lakh",
  "₹1 - ₹5 Lakh",
  "₹5 - ₹10 Lakh",
  "₹10 - ₹25 Lakh",
  "₹25 Lakh - ₹1 Crore",
  "Above ₹1 Crore",
];

const employeeOptions = [
  "1 - 5",
  "6 - 10",
  "11 - 20",
  "21 - 50",
  "51 - 100",
  "More than 100",
];

function loadBusinessData() {
  const saved = getUserItem("schemeSaathiBusinessDetails");
  return saved ? { ...initialForm, ...saved } : { ...initialForm };
}

export default function BusinessDetailsPage() {
  const { t } = useLanguage();
  const editMode =
    sessionStorage.getItem("schemeSaathiEditMode");

  const isEditMode = editMode === "business";

  // Always start from this account's saved answers, if any -- revisiting
  // the wizard should never show a blank form when data already exists.
  const [form, setForm] = useState(loadBusinessData);

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
      !form.businessType ||
      !form.businessActivity.trim() ||
      !form.businessStage ||
      !form.yearsInBusiness ||
      !form.annualTurnover ||
      !form.numberOfEmployees
    ) {
      alert("Please complete all business details.");
      return;
    }

    setUserItem("schemeSaathiBusinessDetails", form);

    const cameFromEdit = isEditMode;

    sessionStorage.removeItem("schemeSaathiEditMode");

    if (cameFromEdit) {
      window.location.assign("/find-schemes/review");
    } else {
      window.location.assign("/find-schemes/other-details");
    }
  };

  const handleBack = () => {
    if (isEditMode) {
      sessionStorage.removeItem("schemeSaathiEditMode");
      window.location.assign("/find-schemes/review");
    } else {
      window.location.assign("/find-schemes/personal-info");
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">
        <ProgressSteps currentStep={2} />

        <div className="mx-auto max-w-287.5 px-5 sm:px-8">
          <div className="mt-9">
            <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-[#172b49]">
              Tell us about your business
            </h1>

            {isEditMode && (
              <p className="mt-2 text-[13px] text-slate-500">
                Update your business information below.
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_330px]">
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-6">
              <form
                id="business-form"
                onSubmit={handleContinue}
              >
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <FormSelect
                    label="Business Type"
                    name="businessType"
                    placeholder="Select Business Type"
                    value={form.businessType}
                    onChange={handleChange}
                    options={businessTypes}
                  />

                  <FormInput
                    label="Business Activity"
                    name="businessActivity"
                    placeholder="Describe your business"
                    value={form.businessActivity}
                    onChange={handleChange}
                  />

                  <FormSelect
                    label="Business Stage"
                    name="businessStage"
                    placeholder="Select Stage"
                    value={form.businessStage}
                    onChange={handleChange}
                    options={businessStages}
                  />

                  <FormSelect
                    label="Years in Business"
                    name="yearsInBusiness"
                    placeholder="Select"
                    value={form.yearsInBusiness}
                    onChange={handleChange}
                    options={yearsOptions}
                  />

                  <FormSelect
                    label="Annual Turnover"
                    name="annualTurnover"
                    placeholder="Select Range"
                    value={form.annualTurnover}
                    onChange={handleChange}
                    options={turnoverOptions}
                  />

                  <FormSelect
                    label="Number of Employees"
                    name="numberOfEmployees"
                    placeholder="Select Range"
                    value={form.numberOfEmployees}
                    onChange={handleChange}
                    options={employeeOptions}
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
              form="business-form"
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

function FormInput({
  label,
  name,
  placeholder,
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
      </span>

      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] outline-none placeholder:text-slate-400 focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
      />
    </label>
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