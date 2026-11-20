import { saveSchemeProfileSection } from "../../lib/schemeProfile";
import { apiError } from "../../lib/api";
import React, { useState } from "react";
import ProgressSteps from "./ProgressSteps";
import WhyAskCard from "./WhyAskCard";
import { MainLayout } from "../layout";
import { STATES, getDistrictsForState } from "../../lib/statesDistricts";
import { getUserItem } from "../../lib/userStorage";
import { useLanguage } from "../../lib/i18n.jsx";

/* ====== INITIAL FORM ====== */

const initialForm = {
  fullName: "",
  phoneNumber: "",
  age: "",
  gender: "",
  category: "",
  state: "",
  district: "",
  disability: "",
  residence: "",
  education: "",
  occupation: "",
  interests: "",
  welfareNeeds: "",
  entrepreneurshipSupport: "",
};

/* ====== OPTIONS ====== */

const genders = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
];

const categories = [
  "SC",
  "ST",
  "OBC",
  "Minority",
  "General",
  "Other",
];

const states = STATES;

/* ====== LOCAL STORAGE KEY ====== */

/* Base storage key -- actual reads/writes go through getUserItem/setUserItem
   in userStorage.js, which namespace it per signed-in account. */
const PERSONAL_STORAGE_KEY = "schemeSaathiPersonalDetails";

/* ====== LOAD SAVED PERSONAL INFORMATION (scoped to the signed-in account) ====== */

function getLoggedInAccount() {
  try {
    const raw = sessionStorage.getItem("schemeSaathiUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSavedPersonalInfo() {
  const saved = getUserItem("schemeSaathiPersonalDetails");

  if (saved && Object.keys(saved).length) {
    return { ...initialForm, ...saved };
  }

  // No wizard data saved yet for this account -- pre-fill what we already
  // know from sign-up so the person doesn't retype their own name/number.
  const account = getLoggedInAccount();
  return {
    ...initialForm,
    fullName: account?.fullName || "",
    phoneNumber: account?.mobile || "",
  };
}

/* ====== PAGE ====== */

export default function PersonalInfoPage() {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isEditMode =
    sessionStorage.getItem("schemeSaathiEditMode") === "personal";

  /* ====== FORM STATE ======
     Always starts from whatever this account has already saved, so
     revisiting the wizard never wipes out real answers. */

  const [form, setForm] = useState(getSavedPersonalInfo);

  /* ====== HANDLE CHANGE ====== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      // Changing state invalidates whatever district was picked for the old state.
      ...(name === "state" ? { district: "" } : {}),
    }));
  };

  /* ====== VALIDATION ====== */

  const validateForm = () => {
    if (!form.fullName.trim()) {
      alert("Please enter your full name.");
      return false;
    }

    if (form.phoneNumber.trim() && !/^\d{10}$/.test(form.phoneNumber.trim())) {
      alert("Please enter a valid 10-digit mobile number.");
      return false;
    }

    if (!form.age) {
      alert("Please enter your age.");
      return false;
    }

    const age = Number(form.age);

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      alert("Please enter a valid age between 1 and 120.");
      return false;
    }

    if (!form.gender) {
      alert("Please select your gender.");
      return false;
    }

    if (!form.category) {
      alert("Please select your social category.");
      return false;
    }

    if (!form.state) {
      alert("Please select your state.");
      return false;
    }

    if (!getDistrictsForState(form.state).includes(form.district)) {
      alert("Please select your district.");
      return false;
    }

    return true;
  };

  /* ====== CONTINUE ====== */

  const handleContinue = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaveError("");

    if (!validateForm()) {
      return;
    }

  const isEditing =
    sessionStorage.getItem("schemeSaathiEditMode") ===
    "personal";

    setSaving(true);
    try { await saveSchemeProfileSection("personal", form); }
    catch (error) { setSaveError(apiError(error)); setSaving(false); return; }

    sessionStorage.removeItem("schemeSaathiEditMode");

    if (isEditing) {
    window.location.assign("/find-schemes/review");
    return;
  }


    window.location.assign(form.entrepreneurshipSupport === "Yes"
      ? "/find-schemes/business-details" : "/find-schemes/other-details");
  };

  const handleBack = () => {
    sessionStorage.removeItem("schemeSaathiEditMode");

    window.location.assign("/");
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc] pb-20">

        {/* PROGRESS */}

        <ProgressSteps currentStep={1} />

        {/* CONTENT */}

        <div className="mx-auto max-w-287.5 px-5 sm:px-8">

          {/* HEADING */}

          <div className="mt-9">
            <h1 className="text-[27px] font-extrabold tracking-[-0.02em] text-[#172b49]">
              {isEditMode
                ? t("wizard_personal_edit_title")
                : t("wizard_personal_title")}
            </h1>

            <p className="mt-2 text-[13px] text-slate-500">
              {isEditMode
                ? t("Update your information and continue.")
                : t("Please provide your basic information to find suitable government schemes.")}
            </p>
          </div>

          {/* MAIN GRID */}

          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_330px]">

            {/* FORM CARD */}

            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-6">

              <form
                id="personal-info-form"
                onSubmit={handleContinue}
              >

                <fieldset disabled={saving} className="contents"><div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

                  {/* FULL NAME */}

                  <FormInput
                    label={t("Full Name")}
                    name="fullName"
                    type="text"
                    placeholder={t("Enter your full name")}
                    value={form.fullName}
                    onChange={handleChange}
                  />

                  {/* MOBILE NUMBER */}

                  <FormInput
                    label={t("Mobile Number (optional)")}
                    name="phoneNumber"
                    optional
                    type="tel"
                    placeholder={t("10-digit mobile number")}
                    value={form.phoneNumber}
                    onChange={handleChange}
                  />

                  {/* AGE */}

                  <FormInput
                    label={t("Age")}
                    name="age"
                    type="number"
                    placeholder={t("Enter age")}
                    value={form.age}
                    onChange={handleChange}
                    min="1"
                    max="120"
                  />

                  {/* GENDER */}

                  <FormSelect
                    label={t("Gender")}
                    name="gender"
                    placeholder={t("Select Gender")}
                    value={form.gender}
                    onChange={handleChange}
                    options={genders}
                  />

                  {/* CATEGORY */}

                  <FormSelect
                    label={t("Social Category")}
                    name="category"
                    placeholder={t("Select Category")}
                    value={form.category}
                    onChange={handleChange}
                    options={categories}
                  />

                  <FormSelect label={t("Disability")} name="disability" placeholder={t("Not provided")} optional value={form.disability} onChange={handleChange} options={["No", "Yes"]} />
                  <FormSelect label={t("Residence")} name="residence" placeholder={t("Not provided")} optional value={form.residence} onChange={handleChange} options={["Urban", "Rural"]} />
                  {/* STATE */}

                  <FormSelect
                    label={t("State")}
                    name="state"
                    placeholder={t("Select State")}
                    value={form.state}
                    onChange={handleChange}
                    options={states}
                  />

                  {/* DISTRICT / CITY */}

                  <FormSelect
                    label={t("District")}
                    name="district"
                    placeholder={form.state ? t("Select your district") : t("Select a state first")}
                    value={form.district}
                    onChange={handleChange}
                    options={getDistrictsForState(form.state)}
                  />

                  <FormSelect label={t("Education")} name="education" optional placeholder={t("Not provided")} value={form.education} onChange={handleChange} options={["No formal education", "Primary", "Secondary", "Higher secondary", "Diploma", "Graduate", "Postgraduate", "Other"]} />
                  <FormSelect label={t("Occupation")} name="occupation" optional placeholder={t("Not provided")} value={form.occupation} onChange={handleChange} options={["Student", "Farmer", "Agricultural worker", "Employed", "Unemployed", "Homemaker", "Self-employed", "Retired", "Other"]} />
                  <FormInput label={t("Interests (optional)")} name="interests" optional placeholder={t("For example: education, healthcare, agriculture")} value={form.interests} onChange={handleChange} />
                  <FormInput label={t("Welfare needs (optional)")} name="welfareNeeds" optional placeholder={t("For example: housing, pension, disability support")} value={form.welfareNeeds} onChange={handleChange} />
                  <FormSelect label={t("Do you want entrepreneurship support?")} name="entrepreneurshipSupport" optional placeholder={t("Not sure / not provided")} value={form.entrepreneurshipSupport} onChange={handleChange} options={["Yes", "No"]} />

                </div>
              </fieldset>
                {saveError && <p role="alert" className="mt-4 text-sm text-red-700">{saveError}</p>}
                {saving && <p role="status" className="mt-4 text-sm text-slate-600">{t("Saving your details?")}</p>}
              </form>

            </section>

            {/* WHY ASK */}

            <WhyAskCard />

          </div>

          {/* BUTTONS */}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            {/* BACK */}

            <button
              type="button"
              onClick={handleBack}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-8 text-[13px] font-medium text-[#0d2b55] transition hover:bg-slate-50 sm:w-37.5"
            >
              ← {t("common_back")}
            </button>

            {/* CONTINUE */}

            <button
              type="submit"
              disabled={saving}
              form="personal-info-form"
              className="h-11 w-full rounded-lg bg-[#0d2b55] px-8 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#173b70] active:scale-[0.99] sm:w-58"
            >
              {t("common_continue")} →
            </button>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}

/* ====== INPUT COMPONENT ====== */

function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  min,
  max,
  optional = false,
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
      </span>

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={!optional}
        maxLength={500}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
      />

    </label>
  );
}

/* ====== SELECT COMPONENT ====== */

function FormSelect({
  label,
  name,
  placeholder,
  value,
  onChange,
  options,
  optional = false,
}) {
  const { t } = useLanguage();
  return (
    <label className="block">

      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={!optional}
        className={`h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] outline-none transition focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10 ${
          value
            ? "text-slate-700"
            : "text-slate-400"
        }`}
      >

        <option value="" disabled={!optional}>
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {t(option)}
          </option>
        ))}

      </select>

    </label>
  );
}

/* ====== COMBO BOX (dropdown suggestions + free text) ======
   Used for district/city: shows every district for the selected state,
   but never blocks typing a town/village/city that isn't in the list. */

function FormComboBox({
  label,
  name,
  placeholder,
  value,
  onChange,
  options,
}) {
  const listId = `${name}-options`;

  return (
    <label className="block">

      <span className="mb-2 block text-[13px] font-medium text-slate-700">
        {label}
      </span>

      <input
        list={listId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        required
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10"
      />

      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

    </label>
  );
}
