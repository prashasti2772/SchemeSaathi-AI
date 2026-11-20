import { useLanguage } from "../../lib/i18n.jsx";
import { useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import CaptchaVerification from "./CaptchaVerification";
import { api, apiError, saveSession } from "../../lib/api";
export default function AccountForm({ register = false }) {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [duplicate, setDuplicate] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setDuplicate(false); setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = await api.post("/citizen/" + (register ? "register" : "login"), fields);
      if (register) { window.location.assign("/signin?registered=1"); } else { saveSession(data); window.location.assign("/"); }
    } catch (e) {
      const alreadyRegistered = register && e.response?.status === 409;
      setDuplicate(alreadyRegistered);
      setError(alreadyRegistered ? "Already registered. An account with this email or mobile number exists." : !register && e.response?.status === 401 ? "Email/mobile number or password is incorrect. Please try again or use Forgot password." : apiError(e));
      if (register) { setCaptchaReady(false); setCaptchaVersion((value) => value + 1); }
    } finally { setBusy(false); }
  }
  const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm";
  return <AuthLayout mode={register ? "register" : "signin"}><AuthCard title={register ? t("Create Account") : t("Sign In")}>
    <form onSubmit={submit} className="mx-auto mt-7 max-w-lg">
      {register && <><label>{t("Full name")}<input className={input} name="full_name" required minLength={2} autoComplete="name" /></label>
      <label>{t("Mobile number (optional)")}<input className={input} name="mobile" type="tel" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel" /></label>
      <label>{t("Email")}<input className={input} name="email" type="email" required autoComplete="email" /></label></>}
      {!register && <label>{t("Email or mobile number")}<input className={input} name="identifier" required autoComplete="username" /></label>}
      <label>{t("Password")}
        <div className="relative">
          <input
            className={`${input} pr-12`}
            name="password"
            type={showPassword ? "text" : "password"}
            minLength={register ? 10 : 1}
            maxLength={128}
            required
            autoComplete={register ? "new-password" : "current-password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 4.3A10 10 0 0 1 12 4c6 0 9.75 8 9.75 8a17 17 0 0 1-3.1 4.3" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M6.2 6.2C3.7 8.2 2.25 12 2.25 12S6 20 12 20c1.5 0 2.9-.4 4.1-1" />
</svg>) : (<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12S6 5.25 12 5.25 21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
  <circle cx="12" cy="12" r="3" />
</svg>)}
          </button>
        </div>
      </label>
      {register && <p className="mb-4 text-xs text-slate-600">{t("Use at least 10 characters. Your account stores your name and contact details. Scheme screening does not submit a government application.")}</p>}
      {register && <CaptchaVerification key={captchaVersion} disabled={busy} onReadyChange={setCaptchaReady} />}
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{duplicate && <p className="mt-2"><a href="/signin" className="font-medium underline">{t("Sign in")}</a> {t("or")}<a href="/forgot-password" className="font-medium underline">{t("reset your password")}</a>.</p>}</div>}
      <button disabled={busy || (register && !captchaReady)} className="w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50">{busy ? t("Please wait...") : register ? t("Create Account") : t("Sign In")}</button>
      {!register && <p className="mt-4 text-right text-sm"><a className="underline" href="/forgot-password">{t("Forgot password?")}</a></p>}
      <p className="mt-5 text-sm"><a className="underline" href={register ? "/signin" : "/signup"}>{register ? t("Already registered? Sign in") : t("Create an account")}</a></p>
      <a className="mt-4 block text-sm underline" href="/">{t("Back to home")}</a>
    </form></AuthCard></AuthLayout>;
}

