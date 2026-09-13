import { useLanguage } from "../../lib/i18n.jsx";
import React from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  const { t } = useLanguage();
  return (
    <div className="official-shell min-h-screen text-[#172b49]">
      <Header />
      <main className="relative">{children}</main>
      {window.location.pathname !== "/support" && (
        <a
          href="/support"
          className="fixed bottom-5 right-5 z-40 rounded-full border border-[#d8aa2d] bg-[#0d2b55] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(8,29,61,0.25)] transition hover:-translate-y-0.5 hover:bg-[#143b6e]"
        >
          {t("Help & support")}
        </a>
      )}
      <Footer />
    </div>
  );
}
