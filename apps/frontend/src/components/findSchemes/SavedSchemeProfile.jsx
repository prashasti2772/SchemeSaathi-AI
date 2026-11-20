import { useEffect, useState } from "react";
import { MainLayout } from "../layout";
import { apiError } from "../../lib/api";
import { hasProfileSession, loadSchemeProfile } from "../../lib/schemeProfile";
import { useLanguage } from "../../lib/i18n.jsx";

// Hydrate before the existing forms initialize their account-scoped local state.
export default function SavedSchemeProfile({ children }) {
  const { t } = useLanguage();
  const [ready, setReady] = useState(() => !hasProfileSession());
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!hasProfileSession()) return;
    const controller = new AbortController();
    loadSchemeProfile(controller.signal).then(() => {
      if (!controller.signal.aborted) setReady(true);
    }).catch(err => {
      if (!controller.signal.aborted) setError(apiError(err));
    });
    return () => controller.abort();
  }, [attempt]);
  if (ready) return children;
  return <MainLayout><main className="mx-auto max-w-3xl px-5 py-12">
    {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-800">
      <p>{t("We could not load your saved details.")} {error}</p>
      <button type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }} className="mt-3 rounded-lg bg-[#0d2b55] px-4 py-2 text-white">{t("Try again")}</button>
    </div> : <p role="status" className="text-slate-700">{t("Loading your saved details…")}</p>}
  </main></MainLayout>;
}
