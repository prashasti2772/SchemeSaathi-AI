import { useEffect, useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import { api, apiError, saveSession } from "../../lib/api";
import { useLanguage } from "../../lib/i18n.jsx";

const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base";
const button = "w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50";
const remaining = (deadline, now) => Math.max(0, Math.ceil((deadline - now) / 1000));

export default function SignInPage() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const [registeredNotice] = useState(() => new URLSearchParams(window.location.search).get("registered") === "1");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resendSeconds = remaining(Math.max(challenge?.resendAt || 0, retryAt), now);
  const expirySeconds = remaining(challenge?.expiresAt || 0, now);

  function rememberChallenge(data) {
    const receivedAt = Date.now();
    setNow(receivedAt);
    setChallenge({ id: data.challenge_id, destination: data.destination,
      expiresAt: receivedAt + data.expires_in * 1000, resendAt: receivedAt + data.resend_after * 1000 });
    setOtp("");
  }


  function handleFailure(failure) {
    const detail = failure.response?.status === 401
      ? "Email/mobile number or password is incorrect. Please try again or use Forgot password."
      : apiError(failure);
    setError(detail);
    if (failure.response?.status === 429) {
      const seconds = Number(failure.response.headers?.["retry-after"]) || 60;
      setRetryAt(Date.now() + seconds * 1000);
    }
    if (failure.response?.status === 410) setChallenge((current) => current ? { ...current, expiresAt: 0 } : null);
  }
  async function start(event) {
    event.preventDefault();
    if (busy || resendSeconds > 0) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/citizen/login", { identifier: identifier.trim(), password: fields.get("password") }, { timeout: 30000 });
      event.target.reset();
      rememberChallenge(data);
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(false); }
  }
  async function verify(event) {
    event.preventDefault();
    if (busy || !challenge || expirySeconds <= 0) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/citizen/verify-login-otp", { challenge_id: challenge.id, otp });
      saveSession(data);
      setOtp(""); setChallenge(null);
      window.location.assign("/");
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (busy || !challenge || resendSeconds > 0 || expirySeconds <= 0) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/citizen/resend-login-otp", { challenge_id: challenge.id }, { timeout: 30000 });
      rememberChallenge(data);
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(false); }
  }
  function restart() {
    setRetryAt((current) => Math.max(current, challenge?.resendAt || 0));
    setChallenge(null); setOtp(""); setError("");
  }

  return <AuthLayout mode="signin"><AuthCard title={challenge ? t("Verify your sign-in") : t("Sign In")}>
    <div className="mx-auto mt-7 max-w-lg">
      {registeredNotice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{t("Account created successfully. Sign in to receive a verification code by email.")}</div>}
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{t(error)}</div>}
      {!challenge ? <form onSubmit={start}>
        <p className="mb-5 text-sm leading-relaxed text-slate-600">{t("Sign in with your password, then verify the code sent to your registered email address.")}</p>
        <label>{t("Email or mobile number")}<input className={input} name="identifier" required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} disabled={busy} /></label>
        <label>{t("Password")}
          <div className="relative">
            <input
              className={`${input} pr-12`}
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={1}
              maxLength={128}
              required
              autoComplete="current-password"
              disabled={busy}
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
        <button className={button} disabled={busy || resendSeconds > 0}>{busy ? t("Please wait...") : resendSeconds > 0 ? t("Try again in {seconds}s", { seconds: resendSeconds }) : t("Sign In")}</button>
        <p className="mt-4 text-right text-sm"><a className="underline" href="/forgot-password">{t("Forgot password?")}</a></p>
        <p className="mt-5 text-sm"><a className="underline" href="/signup">{t("Create an account")}</a></p>
      </form> : <form onSubmit={verify}>
        <p className="mb-4 text-sm text-slate-600">{t("Enter the six-digit code sent to {destination}.", { destination: challenge.destination })}</p>
        <label>{t("Verification code (OTP)")}<input className={input} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} disabled={busy || expirySeconds <= 0} autoFocus /></label>
        <p className="mb-4 text-sm text-slate-600">{expirySeconds > 0 ? t("Code expires in {seconds}s", { seconds: expirySeconds }) : t("This code has expired. Sign in again to request a new code.")}</p>
        <button className={button} disabled={busy || expirySeconds <= 0}>{busy ? t("Please wait...") : t("Verify OTP and sign in")}</button>
        <button type="button" className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50" onClick={resend} disabled={busy || resendSeconds > 0 || expirySeconds <= 0}>{resendSeconds > 0 ? t("Resend code in {seconds}s", { seconds: resendSeconds }) : t("Resend code")}</button>
        <button type="button" className="mt-4 text-sm underline" disabled={busy} onClick={restart}>{t("Back to sign in")}</button>
      </form>}
      <a className="mt-4 block text-sm underline" href="/">{t("Back to home")}</a>
    </div>
  </AuthCard></AuthLayout>;
}
