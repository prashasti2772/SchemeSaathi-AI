import { useEffect, useState } from "react";
import { api, apiError } from "../../lib/api";

export default function CaptchaVerification({ disabled = false, onReadyChange }) {
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let expiryTimer;
    setLoading(true);
    setError("");
    setAnswer("");
    setChallenge(null);
    setExpired(false);
    onReadyChange(false);
    api.get("/citizen/captcha", { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setChallenge(data);
      onReadyChange(true);
      expiryTimer = window.setTimeout(() => {
        setExpired(true);
        onReadyChange(false);
      }, data.expires_in * 1000);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(apiError(failure));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => {
      controller.abort();
      window.clearTimeout(expiryTimer);
    };
  }, [refresh, onReadyChange]);

  return <fieldset disabled={disabled} className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <legend className="px-1 text-sm font-semibold text-[#172b49]">CAPTCHA verification</legend>
    <div className="flex flex-wrap items-center gap-3">
      {challenge && <img src={challenge.image} alt="CAPTCHA verification code" width="220" height="80" className="max-w-full rounded border border-slate-200 bg-white" />}
      {loading && <p role="status" className="text-sm text-slate-600">Loading verification…</p>}
      <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading || disabled} className="text-sm font-medium text-[#0d2b55] underline disabled:opacity-50">Refresh CAPTCHA</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} Use Refresh CAPTCHA to try again.</p>}
    {expired && <p role="status" className="mt-2 text-sm text-amber-800">This CAPTCHA has expired. Refresh it to continue.</p>}
    <input type="hidden" name="captcha_id" value={challenge?.captcha_id || ""} />
    <label className="mt-3 block text-sm">Enter the characters shown above
      <input name="captcha_answer" value={answer} onChange={(event) => setAnswer(event.target.value)} required disabled={loading || expired || !challenge || disabled} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={6} className="mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base tracking-widest disabled:bg-slate-100" />
    </label>
    <p className="mt-2 text-xs text-slate-600">Letters are not case-sensitive.</p>
  </fieldset>;
}
