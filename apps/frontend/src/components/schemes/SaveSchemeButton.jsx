import { useState } from "react";
import { apiError } from "../../lib/api";
import { hasProfileSession } from "../../lib/schemeProfile";
import { useLanguage } from "../../lib/i18n.jsx";
import { schemeId, useSavedSchemes } from "./SavedSchemesProvider";

export default function SaveSchemeButton({ scheme }) {
  const { t } = useLanguage();
  const saved = useSavedSchemes();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!schemeId(scheme)) return null;
  if (!hasProfileSession()) return <a href="/signin" className="mt-4 inline-block text-xs font-semibold text-[#0d2b55] underline">{t("Sign in to save this scheme")}</a>;
  const exists = saved.schemes.some(item => schemeId(item) === schemeId(scheme));
  return <div className="mt-4">
    <button type="button" disabled={busy || saved.loading || Boolean(saved.error)} aria-pressed={exists} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-[#0d2b55] disabled:opacity-50" onClick={async () => {
      setBusy(true); setError("");
      try { await saved.toggle(scheme); } catch (error) { setError(apiError(error)); }
      finally { setBusy(false); }
    }}>{t(busy ? "Saving…" : exists ? "Remove saved scheme" : "Save scheme")}</button>
    {saved.error && <p role="alert" className="mt-2 text-xs text-red-700">{saved.error} <button type="button" onClick={saved.retry} className="underline">{t("Try again")}</button></p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
