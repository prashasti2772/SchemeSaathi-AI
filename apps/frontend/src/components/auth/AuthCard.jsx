import React from "react";

export default function AuthCard({
  title,
  children,
}) {
  return (
    <section
      className="
        min-h-175
        rounded-2xl
        border
        border-slate-200
        bg-white
        px-7
        py-7
        shadow-sm
        sm:px-12
      "
    >

      {/* Heading */}

      <h2
        className="
          text-center
          text-[27px]
          font-extrabold
          tracking-tight
          text-[#172b49]
        "
      >
        {title}
      </h2>


      {/* Page Content */}

      {children}

    </section>
  );
}