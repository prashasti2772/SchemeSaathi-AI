import React from "react";

const audiences = [
  "Women",
  "SC/ST",
  "OBC",
  "Minorities",
  "Rural",
  "First-time business owners",
];

export default function AudienceSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
      <div className="rounded-2xl border border-slate-200 bg-white px-7 py-7 shadow-sm">
        <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-[#172b49]">
          Built for Marginalized Entrepreneurs
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
          {audiences.map((item, index) => (
            <React.Fragment key={item}>
              <span>{item}</span>
              {index < audiences.length - 1 && (
                <span aria-hidden="true">•</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
