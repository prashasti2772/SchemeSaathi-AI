import React from "react";
import { useLanguage } from "../../lib/i18n.jsx";
import logo from "../logos.png";

const orbitItems = [
  { labelKey: "homepage_stats_schemes", className: "right-0 top-[20px]", href: "/categories" },
  { labelKey: "homepage_stats_categories", className: "right-[-25px] top-[148px]", href: "/categories" },
  { labelKey: "home_support", className: "right-[20px] bottom-[22px]", href: "/support" },
  { labelKey: "home_training", className: "left-[-22px] bottom-[32px]", href: "/resources" },
];

export default function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(216,170,45,0.12),_transparent_28%),linear-gradient(135deg,_#081d3d_0%,_#0d2b55_48%,_#143d73_100%)]">
      <div className="mx-auto grid min-h-98.5 max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
        <div className="relative z-10 max-w-152.5">
          <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.16em] text-[#f4d780]">
            {t("homepage_badge")}
          </p>

          <h1 className="text-[42px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[48px]">
            {t("homepage_title_line1")}
            <br />
            {t("homepage_title_line2")}
            <br />
            <span className="text-[#f4d780]">{t("homepage_highlight")}</span>
          </h1>

          <p className="mt-4 max-w-141.25 text-[16px] font-semibold leading-6 text-slate-200">
            {t("homepage_subtitle")}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <a
              href="/find-schemes"
              className="rounded-xl border border-[#f4d780] bg-[#d8aa2d] px-5 py-2.5 text-sm font-semibold text-[#081d3d] shadow-[0_10px_24px_rgba(216,170,45,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e6bd52]"
            >
              {t("homepage_cta_find")}
            </a>

            <a
              href="/categories"
              className="rounded-xl border border-white/20 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/12"
            >
              {t("homepage_cta_explore")}
            </a>
          </div>
        </div>

        <div className="relative mx-auto flex h-80 w-full max-w-130 items-center justify-center">
          <div className="absolute left-1/2 top-1/2 h-67.5 w-67.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/40" />
          <div className="absolute left-1/2 top-1/2 h-51.25 w-51.25 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/35" />
          <div className="absolute left-1/2 top-1/2 h-33.75 w-33.75 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-400/30" />

          <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full border border-[#f4d780]/70 bg-[radial-gradient(circle,_rgba(255,255,255,0.12),_rgba(255,255,255,0.04)_42%,_rgba(8,29,61,0.15)_100%)] shadow-[0_0_40px_rgba(216,170,45,0.25)] backdrop-blur-sm">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#081d3d] ring-4 ring-[#f4d780]/20">
              <img src={logo} alt={t("Logo")} className="h-16 w-auto object-contain" />
            </div>
          </div>

          {orbitItems.map((item) => (
            <a
              key={item.labelKey}
              href={item.href}
              className={`absolute ${item.className} flex h-10 min-w-31 items-center justify-center rounded-full border border-[#f4d780]/35 bg-white/10 px-5 text-xs font-semibold text-slate-100 shadow-[0_8px_18px_rgba(8,29,61,0.22)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#f4d780] hover:bg-[#f4d780]/12`}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
