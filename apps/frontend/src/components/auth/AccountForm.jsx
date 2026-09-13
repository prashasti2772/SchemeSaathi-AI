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
      <label>{t("Mobile number")}<input className={input} name="mobile" type="tel" pattern="[6-9][0-9]{9}" maxLength={10} required autoComplete="tel" /></label>
      <label>{t("Email")}<input className={input} name="email" type="email" required autoComplete="email" /></label></>}
      {!register && <label>{t("Email or mobile number")}<input className={input} name="identifier" required autoComplete="username" /></label>}
      <label>{t("Password")}<input className={input} name="password" type="password" minLength={register ? 10 : 1} maxLength={128} required autoComplete={register ? "new-password" : "current-password"} /></label>
      {register && <p className="mb-4 text-xs text-slate-600">{t("Use at least 10 characters. Your account stores your name and contact details. Scheme screening does not submit a government application. SMS outreach is optional in Support.")}</p>}
      {register && <CaptchaVerification key={captchaVersion} disabled={busy} onReadyChange={setCaptchaReady} />}
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{duplicate && <p className="mt-2"><a href="/signin" className="font-medium underline">{t("Sign in")}</a> {t("or")}<a href="/forgot-password" className="font-medium underline">{t("reset your password")}</a>.</p>}</div>}
      <button disabled={busy || (register && !captchaReady)} className="w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50">{busy ? t("Please wait...") : register ? t("Create Account") : t("Sign In")}</button>
      {!register && <p className="mt-4 text-right text-sm"><a className="underline" href="/forgot-password">{t("Forgot password?")}</a></p>}
      <p className="mt-5 text-sm"><a className="underline" href={register ? "/signin" : "/signup"}>{register ? t("Already registered? Sign in") : t("Create an account")}</a></p>
      <a className="mt-4 block text-sm underline" href="/">{t("Back to home")}</a>
    </form></AuthCard></AuthLayout>;
}

