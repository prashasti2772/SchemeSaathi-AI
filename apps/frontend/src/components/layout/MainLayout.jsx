import React from "react";
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f6f7fa] text-[#172b49]">
      <Header />
      <main>{children}</main>
      <a href="/support" className="fixed bottom-5 right-5 z-40 rounded-full bg-[#0d2b55] px-5 py-3 text-sm font-semibold text-white shadow-lg">Help & support</a>
      <Footer />
    </div>
  );
}
