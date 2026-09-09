import React from "react";
import ProgressSteps from "./ProgressSteps";
import { MainLayout } from "../layout";
import { getUserItem } from "../../lib/userStorage";
import { useLanguage } from "../../lib/i18n.jsx";


function getData(key) {
  return getUserItem(key) || {};
}

/* ====== REVIEW PAGE ===== */

export default function ReviewPage() {
  const { t } = useLanguage();

  const personal = getData(
    "schemeSaathiPersonalDetails"
  );

  const business = getData(
    "schemeSaathiBusinessDetails"
  );

  const other = getData(
    "schemeSaathiOtherDetails"
  );

  /* ====== EDIT PERSONAL ====== */

  const handleEditPersonal = () => {

    sessionStorage.setItem(
      "schemeSaathiEditMode",
      "personal"
    );

    window.location.assign(
      "/find-schemes/personal-info"
    );
  };

  /* ====== EDIT BUSINESS ====== */

  const handleEditBusiness = () => {

    sessionStorage.setItem(
      "schemeSaathiEditMode",
      "business"
    );

    window.location.assign(
      "/find-schemes/business-details"
    );
  };

  /* ====== EDIT OTHER DETAILS ====== */

  const handleEditOther = () => {

    sessionStorage.setItem(
      "schemeSaathiEditMode",
      "other"
    );

    window.location.assign(
      "/find-schemes/other-details"
    );
  };

  /* ==== FIND MATCHING SCHEMES ===== */

  const handleFindSchemes = () => {

    window.location.assign(
      "/find-schemes/results"
    );
  };

  /* ====== RENDER ====== */

  return (
    <MainLayout>

      <div
        className="
          min-h-[calc(100vh-132px)]
          bg-[#f7f8fc]
          pb-20
        "
      >

        {/* ====== PROGRESS ====== */}

        <ProgressSteps currentStep={4} />

        {/* ====== CONTENT ====== */}

        <div
          className="
            mx-auto
            max-w-287.5
            px-5
            sm:px-8
          "
        >

          {/* ====== HEADING ====== */}

          <div className="mt-9">

            <h1
              className="
                text-[28px]
                font-extrabold
                tracking-[-0.02em]
                text-[#172b49]
              "
            >
              {t("review_title")}
            </h1>

            <p
              className="
                mt-2
                text-[14px]
                text-slate-500
              "
            >
              Please verify your details before
              finding matching schemes.
            </p>

          </div>

          {/* ====== REVIEW CARDS ====== */}

          <div className="mt-6 space-y-5">

            {/* ====== PERSONAL INFORMATION ====== */}

            <ReviewCard
              title="Personal Information"
              onEdit={handleEditPersonal}
            >

              <InfoGrid
                items={[
                  [
                    "Name",
                    personal.fullName ||
                      "Not provided",
                  ],
                  [
                    "Mobile Number",
                    personal.phoneNumber ||
                      "Not provided",
                  ],
                  [
                    "Age",
                    personal.age ||
                      "Not provided",
                  ],
                  [
                    "Gender",
                    personal.gender ||
                      "Not provided",
                  ],
                  [
                    "Social Category",
                    personal.category ||
                      "Not provided",
                  ],
                  [
                    "State",
                    personal.state ||
                      "Not provided",
                  ],
                  [
                    "District",
                    personal.district ||
                      "Not provided",
                  ],
                ]}
              />

            </ReviewCard>

            {/* ====== BUSINESS DETAILS ====== */}

            <ReviewCard
              title="Business Details"
              onEdit={handleEditBusiness}
            >

              <InfoGrid
                items={[
                  [
                    "Business Type",
                    business.businessType ||
                      "Not provided",
                  ],
                  [
                    "Business Activity",
                    business.businessActivity ||
                      "Not provided",
                  ],
                  [
                    "Business Stage",
                    business.businessStage ||
                      "Not provided",
                  ],
                  [
                    "Years in Business",
                    business.yearsInBusiness ||
                      "Not provided",
                  ],
                  [
                    "Annual Turnover",
                    business.annualTurnover ||
                      "Not provided",
                  ],
                  [
                    "Employees",
                    business.numberOfEmployees ||
                      "Not provided",
                  ],
                ]}
              />

            </ReviewCard>

            {/* ====== OTHER DETAILS ====== */}

            <ReviewCard
              title="Other Details"
              onEdit={handleEditOther}
            >

              <InfoGrid
                items={[
                  [
                    "Annual Income",
                    other.annualIncome ||
                      "Not provided",
                  ],
                  [
                    "Registered Business",
                    other.registeredBusiness ||
                      "Not provided",
                  ],
                  [
                    "Funding Required",
                    other.fundingRequired ||
                      "Not provided",
                  ],
                  [
                    "Preferred Support",
                    other.preferredSupport ||
                      "Not provided",
                  ],
                  [
                    "Previous Government Scheme",
                    other.previousScheme ||
                      "Not provided",
                  ],
                  [
                    "Interested Scheme Type",
                    other.interestedSchemeType ||
                      "Not provided",
                  ],
                ]}
              />

            </ReviewCard>

          </div>

          {/* ====== BOTTOM ACTIONS ====== */}

          <div
            className="
              mt-8
              flex
              flex-col-reverse
              gap-3
              sm:flex-row
              sm:justify-end
            "
          >

            {/* ====== BACK ====== */}

            <button
              type="button"
              onClick={() =>
                window.location.assign(
                  "/find-schemes/other-details"
                )
              }
              className="
                h-12
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-8
                text-sm
                font-semibold
                text-[#0d2b55]
                transition
                hover:bg-slate-50
                sm:w-37.5
              "
            >
              ← {t("common_back")}
            </button>

            {/* ====== FIND SCHEMES ====== */}

            <button
              type="button"
              onClick={handleFindSchemes}
              className="
                h-12
                w-full
                rounded-xl
                bg-[#0d2b55]
                px-8
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-[#173b70]
                active:scale-[0.99]
                sm:w-65
              "
            >
              {t("review_find_matches")} →
            </button>

          </div>

        </div>

      </div>

    </MainLayout>
  );
}

/* ====== REVIEW CARD ====== */

function ReviewCard({
  title,
  children,
  onEdit,
}) {
  const { t } = useLanguage();

  return (
    <section
      className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-6
        shadow-sm
      "
    >

      {/* ===== CARD HEADER ====== */}

      <div
        className="
          flex
          items-center
          justify-between
          border-b
          border-slate-100
          pb-4
        "
      >

        <h2
          className="
            text-[17px]
            font-bold
            text-[#172b49]
          "
        >
          {title}
        </h2>

        <button
          type="button"
          onClick={onEdit}
          className="
            rounded-lg
            border
            border-slate-200
            px-4
            py-2
            text-[12px]
            font-medium
            text-[#0d2b55]
            transition
            hover:bg-slate-50
          "
        >
          {t("common_edit")}
        </button>

      </div>

      {/* ====== CARD CONTENT ====== */}

      <div className="pt-5">
        {children}
      </div>

    </section>
  );
}

/* ====== INFORMATION GRID ====== */

function InfoGrid({ items }) {

  return (
    <div
      className="
        grid
        gap-x-8
        gap-y-5
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >

      {items.map(([label, value]) => (

        <div key={label}>

          <p
            className="
              text-[11px]
              font-medium
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className="
              mt-1
              wrap-break-words
              text-[14px]
              font-semibold
              text-slate-700
            "
          >
            {value}
          </p>

        </div>

      ))}

    </div>
  );
}