import React from "react";
import logo from "../logos.png";

const orbitItems = [
  { label: "Subsidies", className: "right-0 top-[20px]" },
  { label: "Loans", className: "right-[-25px] top-[148px]" },
  { label: "Support", className: "right-[20px] bottom-[22px]" },
  { label: "Training", className: "left-[-22px] bottom-[32px]" },
];

export default function HeroSection() {
  return (
    <section className="overflow-hidden bg-[hsl(221,72%,18%)]">
      <div className="mx-auto grid min-h-98.5 max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
        {/* Left content */}
        <div className="relative z-10 max-w-152.5">
          <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.02em] text-[#e5bd43]">
            AI-POWERED DISCOVERY
          </p>

          <h1 className="text-[42px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[48px]">
            Find Government
            <br />
            Schemes You
            <br />
            <span className="text-[#f4c63d]">Actually Qualify For</span>
          </h1>

          <p className="mt-4 max-w-141.25 text-[16px] font-semibold leading-6 text-slate-200">
            AI-driven scheme matching that helps marginalized entrepreneurs
            discover financial assistance, subsidies, loans, grants and training.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <a
              href="/find-schemes"
              className="rounded-xl border-2 border-[#e2b83a] bg-amber-400 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 "
            >
              Find Schemes Now 
            </a>

            <a
              href="/categories"
              className="rounded-xl border-2 border-[#e2b83a] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Explore Categories
            </a>
          </div>
        </div>

        {/* Right visual */}
        <div className="relative mx-auto h-80 w-full max-w-130">
          {/* Orbit rings */}
          <div className="absolute left-1/2 top-1/2 h-67.5 w-67.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/40" />
          <div className="absolute left-1/2 top-1/2 h-51.25 w-51.25 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/35" />
          <div className="absolute left-1/2 top-1/2 h-33.75 w-33.75 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/30" />

          {/* Center logo */}
          <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ">
           <img src={logo} alt="Logo" className="h-22 w-auto" />
          </div>

          {/* Orbit labels */}
          {orbitItems.map((item) => (
            <div
              key={item.label}
              className={`absolute ${item.className} flex h-10 min-w-31 items-center justify-center rounded-full bg-white px-5 text-xs font-medium text-slate-700 shadow-lg`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
