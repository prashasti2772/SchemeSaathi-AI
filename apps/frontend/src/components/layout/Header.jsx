import React, { useState } from "react";
import logo from "../logo.jpg";
import { LANGUAGES, useLanguage } from "../../lib/i18n.jsx";

const navItems = [
  { key: "nav_home", href: "/" },
  { key: "nav_find_schemes", href: "/find-schemes" },
  { key: "nav_categories", href: "/categories" },
  { key: "nav_resources", href: "/resources" },
  { key: "nav_about", href: "/about" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { language, setLanguage, t } = useLanguage();

  // Session display state; API requests still require server authentication.
  const isLoggedIn = sessionStorage.getItem("schemeSaathiLoggedIn") === "true";
  const loggedInUser = (() => {
    try {
      const saved = sessionStorage.getItem("schemeSaathiUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const handleSignOut = () => {
    sessionStorage.removeItem("schemeSaathiLoggedIn");
    sessionStorage.removeItem("schemeSaathiToken");
    sessionStorage.removeItem("schemeSaathiUser");
    window.location.href = "/";
  };

  const currentLanguageLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";
  const initials = (loggedInUser?.fullName || "?").trim().charAt(0).toUpperCase();

  // Get current URL
  const currentPath =
    window.location.pathname.replace(/\/+$/, "") || "/";

  // Check active navigation item
  const isActive = (href) => {
    // Home
    if (href === "/") {
      return currentPath === "/";
    }

    // Find Schemes and all its pages
    if (href === "/find-schemes") {
      return (
        currentPath === "/find-schemes" ||
        currentPath.startsWith("/find-schemes/")
      );
    }

    // Other pages
    return (
      currentPath === href ||
      currentPath.startsWith(`${href}/`)
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#1d3e6b] bg-[#081d3d] text-white shadow-[0_10px_30px_rgba(8,29,61,0.18)]">

      <div className="mx-auto flex h-17.5 max-w-7xl items-center px-4 sm:px-6 lg:px-10">

        {/* ============= LEFT SIDE =========== */}

        <div className="flex min-w-0 items-center">

          {/* ================= MOBILE MENU ================= */}

          <div className="mr-3 lg:hidden">

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t("Open navigation menu")}
              aria-expanded={menuOpen}
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                border
                border-white/20
                bg-white/5
                text-[#f4d780]
                transition
                hover:bg-white/10
              "
            >

              {menuOpen ? (
                <span className="text-xl font-semibold">
                  ×
                </span>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="block h-0.5 w-5 bg-[#f4d780]" />
                  <span className="block h-0.5 w-5 bg-[#f4d780]" />
                  <span className="block h-0.5 w-5 bg-[#f4d780]" />
                </div>
              )}

            </button>

          </div>


          {/* ================= LOGO ================= */}

          <img src={logo} alt={t("Logo")} className="h-10 w-auto" />

        </div>


        {/* ====== DESKTOP NAVIGATION ====== */}

        <nav className="ml-auto hidden items-center gap-7 lg:flex xl:gap-10">

          {navItems.map((item) => {

            const active = isActive(item.href);

            return (
              <a
                key={item.key}
                href={item.href}
                className={`
                  whitespace-nowrap
                  text-[14px]
                  font-medium
                  transition-colors

                  ${
                    active
                      ? "text-[#f4d780]"
                      : "text-slate-200 hover:text-white"
                  }
                `}
              >
                {t(item.key)}
              </a>
            );

          })}

        </nav>


        {/* ====== RIGHT SIDE ACTIONS ====== */}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:ml-7">

          {/* ================= LANGUAGE ================= */}

          <div className="relative hidden xl:block">

            <button
              type="button"
              onClick={() => setLanguageMenuOpen((open) => !open)}
              className="
                rounded-full
                border
                border-transparent
                bg-transparent
                px-2.5
                py-2
                text-sm
                font-medium
                text-slate-200
                transition
                hover:text-white
              "
            >
              {currentLanguageLabel}
            </button>

            {languageMenuOpen && (
              <div
                className="
                  absolute
                  right-0
                  mt-2
                  w-48
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  py-1
                  shadow-lg
                "
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code);
                      setLanguageMenuOpen(false);
                    }}
                    className={`
                      block
                      w-full
                      px-4
                      py-2.5
                      text-left
                      text-sm

                      ${
                        lang.code === language
                          ? "bg-[#f4d780] font-semibold text-[#081d3d]"
                          : "text-slate-700 hover:bg-slate-100"
                      }
                    `}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* ================= SIGN IN / PROFILE ================= */}

          {isLoggedIn ? (
            <div className="relative">

              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-label={t("Open profile menu")}
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-[#d8aa2d]
                  text-sm
                  font-semibold
                  text-[#081d3d]
                  transition
                  hover:bg-[#e5bb4d]
                "
              >
                {initials}
              </button>

              {profileMenuOpen && (
                <div
                  className="
                    absolute
                    right-0
                    mt-2
                    w-52
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    py-1
                    shadow-lg
                  "
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-[#172b49]">
                      {loggedInUser?.fullName || "Signed in"}
                    </p>
                    {loggedInUser?.mobile && (
                      <p className="mt-0.5 text-xs text-slate-400">{loggedInUser.mobile}</p>
                    )}
                  </div>

                  <a
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("profile")}
                  </a>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-slate-50"
                  >
                    {t("sign_out")}
                  </button>
                </div>
              )}

            </div>
          ) : (
            <a
              href="/signin"
              className="
                rounded-full
                bg-[#d8aa2d]
                px-4
                py-2.5
                text-sm
                font-medium
                text-[#081d3d]
                transition
                hover:bg-[#e5bb4d]
                sm:px-5
              "
            >
              {t("sign_in")}
            </a>
          )}

        </div>

      </div>


      {/* ====== MOBILE / TABLET DROPDOWN MENU ====== */}

      {menuOpen && (
        <div
          className="
            border-t
            border-white/10
            bg-[#0a1f3c]
            shadow-md
            lg:hidden
          "
        >

          <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">

            <div className="flex flex-col">

              {navItems.map((item) => {

                const active = isActive(item.href);

                return (
                  <a
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      rounded-lg
                      px-4
                      py-3
                      text-[14px]
                      font-medium
                      transition

                      ${
                        active
                          ? "bg-white/10 text-[#f4d780]"
                          : "text-slate-200 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    {t(item.key)}
                  </a>
                );

              })}

              {/* Language picker, mobile */}

              <div className="mt-2 border-t border-slate-100 pt-3">
                <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t("Language")}</p>

                <div className="flex flex-wrap gap-2 px-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`
                        rounded-lg
                        border
                        px-3
                        py-1.5
                        text-xs
                        font-medium

                        ${
                          lang.code === language
                            ? "border-[#d8aa2d] bg-[#d8aa2d] text-[#081d3d]"
                            : "border-white/15 bg-white/5 text-slate-200"
                        }
                      `}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </nav>

        </div>
      )}

    </header>
  );
}
