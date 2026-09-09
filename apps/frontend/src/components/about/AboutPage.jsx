import React from "react";
import { MainLayout } from "../layout";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-132px)] bg-[#f7f8fc]">

        {/* ========= HERO SECTION ========= */}

        <section className="bg-[#0d2b55]">
          <div className="mx-auto max-w-287.5 px-5 py-16 sm:px-8 lg:py-20">

            <div className="max-w-190">

              <span className="inline-flex items-center rounded-full bg-[#fff4c7] px-4 py-1.5 text-[11px] font-bold text-[#8c6b00]">
                ABOUT SCHEMESAATHI
              </span>

              <h1 className="mt-5 text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[44px]">
                Discover the right government schemes,
                <span className="text-[#f4c63d]">
                  {" "}made simple.
                </span>
              </h1>

              <p className="mt-5 max-w-190 text-[15px] leading-7 text-slate-200">
                SchemeSaathi is a smart platform designed to help
                individuals, entrepreneurs and businesses discover
                government schemes that may match their needs,
                eligibility and goals.
              </p>


            </div>

          </div>
        </section>


        {/* ======= WHAT IS SCHEMESAATHI ========= */}

        <section className="mx-auto max-w-287.5 px-5 py-14 sm:px-8">

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#9b7815]">
                Our Mission
              </p>

              <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.02em] text-[#172b49]">
                Making government schemes easier to understand
              </h2>

              <p className="mt-5 text-[14px] leading-7 text-slate-600">
                India has a wide range of government schemes covering
                business loans, subsidies, grants, skill development,
                financial assistance and other forms of support.
              </p>

              <p className="mt-4 text-[14px] leading-7 text-slate-600">
                Finding the right scheme can often be difficult because
                information is spread across different sources and
                eligibility requirements can be confusing.
                SchemeSaathi brings this information together and
                presents potentially relevant schemes in a simple,
                user-friendly format.
              </p>

            </div>


            {/* HIGHLIGHT CARD */}

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0d2b55] text-2xl font-bold text-[#f4c63d]">
                ₹
              </div>

              <h3 className="mt-5 text-[19px] font-bold text-[#172b49]">
                One platform. Multiple opportunities.
              </h3>

              <p className="mt-3 text-[13px] leading-6 text-slate-500">
                Enter your information once and explore government
                schemes that may be relevant to your personal or
                business requirements.
              </p>

            </div>

          </div>

        </section>


        {/* ========= HOW IT WORKS========= */}

        <section className="border-y border-slate-200 bg-white">

          <div className="mx-auto max-w-287.5 px-5 py-14 sm:px-8">

            <div className="text-center">

              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#9b7815]">
                How It Works
              </p>

              <h2 className="mt-2 text-[28px] font-extrabold text-[#172b49]">
                Finding schemes in a few simple steps
              </h2>

              <p className="mx-auto mt-3 max-w-190 text-[13px] leading-6 text-slate-500">
                SchemeSaathi simplifies the process of discovering
                government support opportunities.
              </p>

            </div>


            <div className="mt-10 grid gap-5 md:grid-cols-4">

              <StepCard
                number="01"
                title="Personal Information"
                description="Provide basic details such as age, category, state and district."
              />

              <StepCard
                number="02"
                title="Business Details"
                description="Tell us about your business type, stage, turnover and employees."
              />

              <StepCard
                number="03"
                title="Other Details"
                description="Select your preferred support and funding requirements."
              />

              <StepCard
                number="04"
                title="Get Matches"
                description="Explore schemes that may be relevant to your profile."
              />

            </div>

          </div>

        </section>


        {/* ========= FEATURES ========== */}

        <section className="mx-auto max-w-287.5 px-5 py-14 sm:px-8">

          <div className="text-center">

            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#9b7815]">
              Why SchemeSaathi
            </p>

            <h2 className="mt-2 text-[28px] font-extrabold text-[#172b49]">
              Built to make scheme discovery easier
            </h2>

          </div>


          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            <FeatureCard
              icon="🔎"
              title="Simple Discovery"
              description="Search and explore government schemes without going through complicated information."
            />

            <FeatureCard
              icon="🎯"
              title="Profile-Based Matching"
              description="Your personal and business information can be used to identify potentially relevant schemes."
            />

            <FeatureCard
              icon="📋"
              title="Clear Information"
              description="Understand scheme benefits, financial support and basic eligibility requirements."
            />

            <FeatureCard
              icon="⚡"
              title="Quick Process"
              description="Enter your information through a simple step-by-step process."
            />

            <FeatureCard
              icon="💼"
              title="Business Support"
              description="Discover opportunities related to loans, subsidies, grants and business development."
            />

            <FeatureCard
              icon="🤝"
              title="Accessible for Everyone"
              description="Designed with a clean and straightforward interface for different types of users."
            />

          </div>

        </section>


        {/* ========= DISCLAIMER ======== */}

        <section className="mx-auto max-w-287.5 px-5 pb-14 sm:px-8">

          <div className="rounded-2xl border border-[#eadca5] bg-[#fffaf0] p-6">

            <div className="flex gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0b8] text-lg">
                ℹ
              </div>

              <div>

                <h3 className="text-[14px] font-bold text-[#172b49]">
                  Important Information
                </h3>

                <p className="mt-2 text-[12px] leading-6 text-slate-600">
                  SchemeSaathi is intended to help users discover and
                  understand potentially relevant government schemes.
                  Eligibility, benefits, application procedures and
                  availability may vary. Users should verify the latest
                  information and eligibility requirements through the
                  official government source before applying.
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ======= CTA ======= */}

        <section className="bg-[#0d2b55]">

          <div className="mx-auto max-w-287.5 px-5 py-12 text-center sm:px-8">

            <h2 className="text-[27px] font-extrabold text-white">
              Ready to find schemes for you?
            </h2>

            <p className="mx-auto mt-3 max-w-190 text-[13px] leading-6 text-slate-300">
              Start by providing a few details and discover
              government schemes that may match your requirements.
            </p>

            <a
              href="/find-schemes"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#f4c63d] px-8 text-[13px] font-bold text-[#0d2b55] transition hover:bg-[#ffd95c]"
            >
              Find Matching Schemes →
            </a>

          </div>

        </section>

      </div>
    </MainLayout>
  );
}


/* ======= STEP CARD =========== */

function StepCard({
  number,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f7f8fc] p-5">

      <div className="flex items-center justify-between">

        <span className="text-[11px] font-extrab800 text-[#9b7815]">
          {number}
        </span>

        <span className="h-px flex-1 bg-slate-200 ml-3" />

      </div>

      <h3 className="mt-5 text-[15px] font-bold text-[#172b49]">
        {title}
      </h3>

      <p className="mt-2 text-[12px] leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}


/* ======= FEATURE CARD ======== */

function FeatureCard({
  icon,
  title,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3fa] text-xl">
        {icon}
      </div>

      <h3 className="mt-5 text-[15px] font-bold text-[#172b49]">
        {title}
      </h3>

      <p className="mt-2 text-[12px] leading-6 text-slate-500">
        {description}
      </p>

    </div>
  );
}