import { useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import { api, apiError, saveSession } from "../../lib/api";
export default function AccountForm({ register = false }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { data } = await api.post("/citizen/" + (register ? "register" : "login"), fields);
      saveSession(data); window.location.assign("/");
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }
  const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm";
  return <AuthLayout><AuthCard title={register ? "Create Account" : "Sign In"}>
    <form onSubmit={submit} className="mx-auto mt-7 max-w-lg">
      {register && <><label>Full name<input className={input} name="full_name" required minLength={2} autoComplete="name" /></label>
      <label>Mobile number<input className={input} name="mobile" type="tel" pattern="[6-9][0-9]{9}" maxLength={10} required autoComplete="tel" /></label>
      <label>Email<input className={input} name="email" type="email" required autoComplete="email" /></label></>}
      {!register && <label>Email or mobile number<input className={input} name="identifier" required autoComplete="username" /></label>}
      <label>Password<input className={input} name="password" type="password" minLength={register ? 10 : 1} maxLength={128} required autoComplete={register ? "new-password" : "current-password"} /></label>
      {register && <p className="mb-4 text-xs text-slate-600">Use at least 10 characters. Your account stores your name and contact details. Scheme screening does not submit a government application. SMS outreach is optional in Support.</p>}
      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50">{busy ? "Please wait..." : register ? "Create Account" : "Sign In"}</button>
      {!register && <p className="mt-4 text-right text-sm"><a className="underline" href="/forgot-password">Forgot password?</a></p>}
      <p className="mt-5 text-sm"><a className="underline" href={register ? "/signin" : "/signup"}>{register ? "Already registered? Sign in" : "Create an account"}</a></p>
      <a className="mt-4 block text-sm underline" href="/">Back to home</a>
    </form></AuthCard></AuthLayout>;
}

