import React from "react";
import { useLanguage } from "../../lib/i18n.jsx";

const audiences = [
  "audience_women",
  "audience_scst",
  "audience_obc",
  "audience_minority",
  "audience_rural",
  "audience_first_time",
];

export default function AudienceSection() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
      <div className="rounded-[24px] border border-[#d7dfe9] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(245,247,251,0.96))] px-7 py-7 shadow-[0_18px_38px_rgba(8,29,61,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-[#081d3d]">
            {t("audience_title")}
          </h2>
          <span className="inline-flex w-fit items-center rounded-full border border-[#f4d780] bg-[#fff7dc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e5300]">
            Trusted access
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
          {audiences.map((item, index) => (
            <React.Fragment key={item}>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition hover:border-[#d8aa2d] hover:text-[#081d3d]">
                {t(item)}
              </span>
              {index < audiences.length - 1 && (
                <span aria-hidden="true" className="text-slate-400">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
