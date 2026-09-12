import { useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import { api, apiError } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") || "").trim();

    try {
      const { data } = await api.post("/citizen/forgot-password", { identifier });
      setMessage(data.message + (data.token ? " Use the token below to reset your password." : ""));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm";

  return (
    <AuthLayout>
      <AuthCard title="Forgot password">
        <form onSubmit={submit} className="mx-auto mt-7 max-w-lg">
          <label>Email or mobile number
            <input className={input} name="identifier" required autoComplete="username" placeholder="you@example.com or 9876543210" />
          </label>

          {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
          {message && <p className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

          <button disabled={busy} className="w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50">
            {busy ? "Please wait..." : "Send reset token"}
          </button>

          <div className="mt-5 flex flex-col gap-3 text-sm">
            <a href="/signin" className="underline">Back to sign in</a>
            <a href="/signup" className="underline">Create an account</a>
            <a href="/" className="underline">Back to home</a>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
