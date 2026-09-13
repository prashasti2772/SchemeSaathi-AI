import { phoneCaptcha } from "../../lib/firebase";
import { useLanguage } from "../../lib/i18n.jsx";
import { useEffect, useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import CaptchaVerification from "./CaptchaVerification";
import { api, apiError } from "../../lib/api";

const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base";
const button = "w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50";
const secondsUntil = (deadline, now) => Math.max(0, Math.ceil((deadline - now) / 1000));
const timeLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function ForgotPasswordPage() {
  const { t, language } = useLanguage();
  const [stage, setStage] = useState("request");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState("email");
  const [challenge, setChallenge] = useState(null);
  const [resetGrant, setResetGrant] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [retryAt, setRetryAt] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const resendSeconds = secondsUntil(Math.max(challenge?.resendAt || 0, retryAt), now);
  const otpSeconds = secondsUntil(challenge?.expiresAt || 0, now);
  const resetSeconds = secondsUntil(resetGrant?.expiresAt || 0, now);

  function refreshCaptcha() {
    setCaptchaReady(false);
    setCaptchaVersion((value) => value + 1);
  }

  function restart() {
    setRetryAt((current) => Math.max(current, challenge?.resendAt || 0));
    setChallenge(null);
    setResetGrant(null);
    setOtp("");
    setError("");
    setMessage("");
   
    refreshCaptcha();
    setStage("request");
  }



  async function requestOtp(event) {
    event.preventDefault();
    if (busy || !captchaReady || resendSeconds > 0) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const recaptcha_token = channel === "mobile" ? await phoneCaptcha(language) : null;
      const { data } = await api.post("/citizen/forgot-password", {
        ...(recaptcha_token ? { recaptcha_token, language } : {}),
        channel, identifier: identifier.trim(), captcha_id: fields.captcha_id, captcha_answer: fields.captcha_answer,
      }, { timeout: 30000 });
      const receivedAt = Date.now();
      setNow(receivedAt);
      setChallenge({ id: data.challenge_id, expiresAt: receivedAt + data.expires_in * 1000, resendAt: receivedAt + data.resend_after * 1000 });
      setOtp("");
      setMessage(data.message);
      setStage("verify");
    } catch (failure) {
      setError(apiError(failure));
      const retryAfter = Number(failure.response?.headers?.["retry-after"]);
      if (failure.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) setRetryAt(Date.now() + retryAfter * 1000);
    } finally {
      refreshCaptcha();
      setBusy(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    if (busy || !otpSeconds || otp.length !== 6) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post("/citizen/verify-reset-otp", { challenge_id: challenge.id, otp });
      const receivedAt = Date.now();
      setNow(receivedAt);
      setResetGrant({ token: data.token, expiresAt: receivedAt + data.expires_in * 1000 });
      setChallenge(null);
      setOtp("");
      setMessage("");
     
      setStage("reset");
    } catch (failure) {
      setError(apiError(failure));
      if (failure.response?.status === 410) setChallenge((current) => ({ ...current, expiresAt: 0 }));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    if (busy || !resetSeconds) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setError("");
    if (fields.password !== fields.confirm_password) {
      setError("Passwords do not match. Enter the same password in both fields.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/citizen/reset-password", { token: resetGrant.token, password: fields.password });
      form.reset();
      setResetGrant(null);
      setStage("success");
    } catch (failure) {
      setError(apiError(failure));
      if (failure.response?.status === 410) setResetGrant(null);
    } finally {
      setBusy(false);
    }
  }

  const step = stage === "request" ? 1 : stage === "verify" ? 2 : 3;
  return <AuthLayout mode="recovery"><AuthCard title={stage === "success" ? t("Password updated") : t("Reset your password")}>
    <div id="phone-recaptcha" />
    {stage !== "success" && <ol aria-label={t("Password recovery steps")} className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
      {["Verify identity", "Enter OTP", "New password"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={`border-t-2 pt-2 ${step >= index + 1 ? "border-[#0d2b55] text-[#0d2b55]" : "border-slate-200"}`}>{index + 1}. {label}</li>)}
    </ol>}

    {stage === "request" && <form onSubmit={requestOtp} className="mt-7">
      <fieldset disabled={busy} className="mb-5">
        <legend className="mb-3 text-sm font-semibold">{t("Choose how to reset your password")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[["email", "Reset via Email"], ["mobile", "Reset via Mobile Number"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${channel === value ? "border-[#0d2b55] bg-blue-50" : "border-slate-300"}`}>
            <input type="radio" name="reset_channel" value={value} checked={channel === value} onChange={() => { setChannel(value); setIdentifier(""); setError(""); setRetryAt(0); refreshCaptcha(); }} />{label}
          </label>)}
        </div>
      </fieldset>
      <p className="mb-5 text-sm leading-6 text-slate-600">{channel === "email" ? t("Enter the email address registered with your account to receive a six-digit code by email.") : t("Enter the mobile number registered with your account to receive a six-digit code by SMS.")}</p>
      <label>{channel === "email" ? t("Registered email address") : t("Registered mobile number")}<input className={input} name="identifier" type={channel === "email" ? "email" : "tel"} inputMode={channel === "email" ? "email" : "numeric"} pattern={channel === "mobile" ? "[6-9][0-9]{9}" : undefined} value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={channel === "email" ? 254 : 10} autoComplete={channel === "email" ? "email" : "tel-national"} disabled={busy} /></label>
      <CaptchaVerification key={captchaVersion} disabled={busy} onReadyChange={setCaptchaReady} />
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      <button disabled={busy || !captchaReady || resendSeconds > 0} className={button}>{busy ? t("Sending OTP…") : resendSeconds > 0 ? `Try again in ${resendSeconds}s` : t("Send verification code")}</button>
    </form>}

    {stage === "verify" && <div className="mt-7">
      {message && <p role="status" className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#0d2b55]">{message}</p>}
      <p className="mb-4 text-sm leading-6 text-slate-600">{channel === "email" ? t("Check the inbox and spam folder of the email address you entered.") : t("Check SMS messages on the mobile number you entered.")} {t("Enter the six-digit OTP below.")}</p>
      <form onSubmit={verifyOtp}>
        <label>{t("Verification code (OTP)")}<input className={`${input} tracking-[0.3em]`} name="otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required disabled={busy || !otpSeconds} autoFocus /></label>
        <p className={`mb-4 text-sm ${otpSeconds ? "text-slate-600" : "text-amber-800"}`}>{otpSeconds ? `Code expires in ${timeLabel(otpSeconds)}.` : t("This code has expired or is no longer valid. Request a new code below.")}</p>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        <button className={button} disabled={busy || !otpSeconds || otp.length !== 6}>{busy ? t("Verifying…") : t("Verify OTP")}</button>
      </form>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <button type="button" disabled={busy || resendSeconds > 0} className="text-sm font-medium text-[#0d2b55] underline disabled:text-slate-500 disabled:no-underline" onClick={restart}>{resendSeconds > 0 ? `Request a new code in ${resendSeconds}s` : t("Request a new code")}</button>
        <p className="mt-2 text-xs text-slate-600">{t("Complete a new CAPTCHA before sending another code.")}</p>
        <button type="button" disabled={busy} onClick={restart} className="mt-4 text-sm underline disabled:opacity-50">{t("Choose another contact or reset method")}</button>
      </div>
    </div>}

    {stage === "reset" && <form onSubmit={savePassword} className="mt-7">
      <p role="status" className="mb-5 text-sm text-emerald-800">{channel === "email" ? t("Email verified.") : t("Mobile number verified.")} {t("Choose a new password with at least 10 characters.")}</p>
      <label>{t("New password")}<input className={input} name="password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy || !resetSeconds} autoFocus /></label>
      <label>{t("Confirm new password")}<input className={input} name="confirm_password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" disabled={busy || !resetSeconds} /></label>
      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
      {resetSeconds > 0 ? <><p className="mb-4 text-xs text-slate-600">{t("Complete this step within")}{timeLabel(resetSeconds)}.</p><button className={button} disabled={busy}>{busy ? t("Updating password…") : t("Update password")}</button></> : <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><p>{t("Your verification has expired. Request a new OTP to continue.")}</p><button type="button" onClick={restart} className="mt-2 font-medium underline">{t("Start again")}</button></div>}
    </form>}

    {stage === "success" && <div className="mt-7"><p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{t("Your password has been updated. Sign in using your new password.")}</p><a href="/signin" className={`${button} block text-center`}>{t("Sign in")}</a></div>}

    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm">
      {stage !== "success" && <a href="/signin" className="underline">{t("Back to sign in")}</a>}
      <a href="/support" className="underline">{t("Need help accessing your account?")}</a>
      <a href="/" className="underline">{t("Back to home")}</a>
    </div>
  </AuthCard></AuthLayout>;
}
