import React from "react";
import logo from "../logo.jpg";
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f6fa] lg:grid lg:grid-cols-[33%_67%]">

      {/* ================= LEFT PANEL ================= */}
      <aside className="hidden min-h-screen bg-[#0d2b55] px-12 py-12 text-white lg:flex lg:flex-col">

        {/* Logo */}
        <img src={logo} alt="Logo" className="h-17 w-auto" />

        {/* Main Content */}
        <div className="mt-20 max-w-87.5">

          <h1 className="text-[34px] font-extrabold leading-[1.12]">
            Create your
            <br />
            account
          </h1>

          <p className="mt-3 text-[17px] font-semibold leading-7 text-slate-200">
            Start your journey to find
            <br />
            the right support for your business.
          </p>


          {/* Features */}
          <div className="mt-8 space-y-6">

            <Feature text="Personalized scheme matches" />

            <Feature text="AI-powered recommendations" />

            <Feature text="Secure & private" />

            <Feature text="Free to use" />

          </div>

        </div>


        {/* Bottom Text */}
        <div className="mt-auto">
          <p className="text-[12px] font-medium text-[#e1b938]">
            A Digital India Initiative
          </p>
        </div>

      </aside>


      {/* ================= RIGHT PANEL ================= */}

      <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-12">

        <div className="w-full max-w-87.5">
          {children}
        </div>

      </main>

    </div>
  );
}


/* Feature Component */

function Feature({ text }) {
  return (
    <div className="flex items-center gap-4">

      <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#f4c63d]" />

      <span className="text-[15px] text-slate-200">
        {text}
      </span>

    </div>
  );
}