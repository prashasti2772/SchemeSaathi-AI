import React from "react";

const stats = [
  { value: "650+", label: "Government Schemes" },
  { value: "12", label: "Sector Categories" },
  { value: "36", label: "States & UTs Covered" },
  { value: "Explainable", label: "Preliminary Screening" },
];

export default function StatsSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-10">
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex min-h-24 flex-col items-center justify-center border-b border-slate-100 px-5 py-5 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <div className="text-[26px] font-extrabold tracking-[-0.02em] text-[#172b49]">
              {stat.value}
            </div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
