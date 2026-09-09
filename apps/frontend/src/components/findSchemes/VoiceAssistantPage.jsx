import { useEffect, useRef, useState } from "react";
import { MainLayout } from "../layout";
import { api, apiError, sendAssistantMessage } from "../../lib/api";
import { recordWav } from "../../lib/recordWav";
import FormattedText from "./FormattedText";
export default function VoiceAssistantPage() {
  const [configured, setConfigured] = useState(false);
  const [mode, setMode] = useState("browser");
  const [language, setLanguage] = useState("en");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const stopRef = useRef(null); const timer = useRef(null); const recognition = useRef(null);
  useEffect(() => {
    api.get("/public/voice/status").then(({ data }) => setConfigured(data.configured)).catch(() => setError("Cannot reach voice service."));
    return () => { clearTimeout(timer.current); stopRef.current?.(); recognition.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);
  async function ask(audio_base64) {
    setBusy(true); setError("");
    try {
      if (mode === "bhashini") {
        const { data } = await api.post("/public/voice/chat", { language, ...(audio_base64 ? { audio_base64 } : { text }) }, { timeout: 120000 });
        setText(data.transcript); setReply(data.reply);
        if (data.audio_base64) await new Audio("data:audio/wav;base64," + data.audio_base64).play();
      } else {
        const data = await sendAssistantMessage(text); setReply(data.reply);
        if (window.speechSynthesis) {
          const speech = new SpeechSynthesisUtterance(data.reply.replace(/[#*]/g, "").slice(0, 2500));
          speech.lang = "en-IN"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech);
        }
      }
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }
  async function stop() {
    clearTimeout(timer.current);
    const finish = stopRef.current; stopRef.current = null; setRecording(false);
    if (finish) await ask(await finish());
  }
  async function start() {
    setError("");
    if (mode === "browser") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { setError("Browser speech recognition is unavailable. Type your question below."); return; }
      const r = new SpeechRecognition(); recognition.current = r; r.lang = "en-IN";
      r.onresult = e => setText(e.results[0][0].transcript);
      r.onerror = e => setError("Microphone recognition failed: " + e.error);
      r.onend = () => setRecording(false); r.start(); setRecording(true); return;
    }
    try { stopRef.current = await recordWav(); setRecording(true); timer.current = setTimeout(stop, 40000); }
    catch { setError("Allow microphone access and use HTTPS or localhost."); }
  }
  return <MainLayout><section className="mx-auto max-w-3xl px-5 py-12">
    <h1 className="text-3xl font-bold">Voice assistant</h1>
    <p className="mt-3 text-slate-600">Ask about business loans, subsidies, eligibility and application documents.</p>
    <p className="my-4 rounded-lg bg-amber-50 p-3 text-sm">Bhashini: {configured ? "credentials configured; live service available to try" : "not configured"}. Browser mode uses your browser's speech service and English catalogue answers.</p>
    <label className="block">Voice provider<select disabled={recording || busy} className="m-3 rounded border p-2" value={mode} onChange={e => setMode(e.target.value)}>
      <option value="browser">Browser voice (English)</option><option value="bhashini" disabled={!configured}>Bhashini (Indian languages)</option></select></label>
    {mode === "bhashini" && <label>Language<select className="m-3 rounded border p-2" value={language} onChange={e => setLanguage(e.target.value)} disabled={recording || busy}>
      {Object.entries({en:"English",hi:"Hindi",bn:"Bengali",ta:"Tamil",te:"Telugu",mr:"Marathi",gu:"Gujarati",kn:"Kannada",ml:"Malayalam",pa:"Punjabi",or:"Odia",ur:"Urdu"}).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label>}
    <div className="my-4 flex gap-3"><button disabled={busy} className="rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50" onClick={recording ? (mode === "browser" ? () => recognition.current?.stop() : stop) : start}>{recording ? "Stop recording" : "Use microphone"}</button>
    <button className="rounded border p-3" onClick={() => window.speechSynthesis?.cancel()}>Stop browser audio</button></div>
    <label className="block">Your question<textarea className="mt-2 min-h-28 w-full rounded-lg border p-3" value={text} maxLength={2000} onChange={e => setText(e.target.value)} /></label>
    <button className="my-4 rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50" disabled={busy || recording || !text.trim()} onClick={() => ask()}>{busy ? "Getting answer..." : "Ask assistant"}</button>
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {reply && <div aria-live="polite" className="rounded-xl border bg-white p-6"><FormattedText content={reply} /></div>}
    <a href="/support" className="mt-6 block underline">Need human help? Open a support ticket</a>
  </section></MainLayout>;
}

