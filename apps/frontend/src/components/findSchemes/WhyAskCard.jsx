import React from "react";

const reasons = [
  "Better scheme matches",
  "Relevant benefits",
  "Save time & effort",
  "Trusted recommendations",
];

export default function WhyAskCard() {
  return (
    <aside className="rounded-xl bg-[#edf3ff] px-7 py-8 sm:px-8">
      <h2 className="text-[19px] font-extrabold text-[#172b49]">
        Why we ask this?
      </h2>

      <div className="mt-7 space-y-7">
        {reasons.map((reason) => (
          <div key={reason} className="flex items-center gap-4">
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#299a68]" />
            <span className="text-[13px] text-slate-700">{reason}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
