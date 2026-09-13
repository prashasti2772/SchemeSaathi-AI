import React from "react";
import { useLanguage } from "../../lib/i18n.jsx";

const stats = [
  { value: "650+", labelKey: "homepage_stats_schemes" },
  { value: "12", labelKey: "homepage_stats_categories" },
  { value: "36", labelKey: "homepage_stats_states" },
  { value: "Explainable", labelKey: "homepage_stats_screening" },
];

export default function StatsSection() {
  const { t } = useLanguage();
  return (
    <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10">
      <div className="grid overflow-hidden rounded-[24px] border border-[#d7dfe9] bg-[#f9fafc] shadow-[0_18px_38px_rgba(8,29,61,0.08)] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.labelKey}
            className="group flex min-h-28 flex-col items-center justify-center border-b border-slate-200/90 px-5 py-5 text-center transition duration-200 last:border-b-0 hover:bg-[#fff9ea] sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div className="text-[28px] font-extrabold tracking-[-0.03em] text-[#081d3d]">
              {stat.value}
            </div>
            <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#5d6d82] group-hover:text-[#0d2b55]">
              {t(stat.labelKey)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
