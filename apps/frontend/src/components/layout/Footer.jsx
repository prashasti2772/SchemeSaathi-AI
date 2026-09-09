import React from "react";

export default function Footer() {
  return (
    <footer className="bg-[#0d2b55] text-white">
      <div className="mx-auto flex min-h-15.5 max-w-7xl flex-col items-center justify-between gap-2 px-5 py-4 text-sm sm:flex-row sm:px-8 lg:px-10">
        <span className="font-medium text-slate-200">SchemeSaathi AI</span>

        <p className="text-center text-slate-300">
          Empowering marginalized entrepreneurs with the right government support.
        </p>

        <span className="font-medium text-[#f4c63d]">
          SIH26092 • Student Prototype
        </span>
      </div>
    </footer>
  );
}
