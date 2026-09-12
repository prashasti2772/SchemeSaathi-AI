import { useMemo, useState } from "react";
import AuthLayout from "./AuthLayout";
import AuthCard from "./AuthCard";
import { api, apiError } from "../../lib/api";

export default function ResetPasswordPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const token = params.get("token") || "";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "").trim();

    try {
      const { data } = await api.post("/citizen/reset-password", { token, password });
      setMessage(data.message + " You can now sign in with the new password.");
      event.currentTarget.reset();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  const input = "mb-5 mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm";

  return (
    <AuthLayout>
      <AuthCard title="Reset password">
        <form onSubmit={submit} className="mx-auto mt-7 max-w-lg">
          {!token && <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No reset token was provided. Open this page using a valid token from the forgot-password flow.</p>}

          <label>New password
            <input className={input} name="password" type="password" minLength={10} maxLength={128} required autoComplete="new-password" />
          </label>

          {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
          {message && <p className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

          <button disabled={busy || !token} className="w-full rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50">
            {busy ? "Please wait..." : "Set new password"}
          </button>

          <div className="mt-5 flex flex-col gap-3 text-sm">
            <a href="/signin" className="underline">Back to sign in</a>
            <a href="/forgot-password" className="underline">Request another reset token</a>
            <a href="/" className="underline">Back to home</a>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
