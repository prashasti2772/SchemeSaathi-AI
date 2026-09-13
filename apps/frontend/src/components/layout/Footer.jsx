import { useLanguage } from "../../lib/i18n.jsx";
import React from "react";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-[#1d3e6b] bg-[#081d3d] text-white">
      <div className="mx-auto flex min-h-15.5 max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-sm sm:flex-row sm:px-8 lg:px-10">
        <span className="font-semibold text-slate-100">{t("SchemeSaathi AI")}</span>

        <p className="text-center text-slate-300">
          {t("Empowering marginalized entrepreneurs with the right government support.")}
        </p>

        <span className="font-semibold text-[#f4d780]">
          {t("SIH26092 • Student Prototype")}
        </span>
      </div>
    </footer>
  );
}
