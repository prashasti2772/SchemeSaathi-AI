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
  const audioRef = useRef(null);
  const stopRef = useRef(null); const timer = useRef(null); const recognition = useRef(null);
  useEffect(() => {
    api.get("/public/voice/status").then(({ data }) => setConfigured(data.configured)).catch(() => setError("Cannot reach voice service."));
    return () => { clearTimeout(timer.current); stopRef.current?.().catch(() => {}); recognition.current?.abort(); audioRef.current?.pause(); window.speechSynthesis?.cancel(); };
  }, []);
  async function ask(audio_base64) {
    setBusy(true); setError("");
    try {
      if (mode === "bhashini") {
        const { data } = await api.post("/public/voice/chat", { language, ...(audio_base64 ? { audio_base64 } : { text }) }, { timeout: 120000 });
        setText(data.transcript); setReply(data.reply);
        if (data.warning) setError(data.warning);
        if (data.audio_base64) {
          audioRef.current?.pause();
          audioRef.current = new Audio("data:" + (data.audio_mime_type || "audio/wav") + ";base64," + data.audio_base64);
          try { await audioRef.current.play(); } catch { setError("Your answer is ready. Select Play answer to hear it."); }
        }
      } else {
        const data = await sendAssistantMessage(text, [], null, null, language); setReply(data.reply);
        if (window.speechSynthesis) {
          const speech = new SpeechSynthesisUtterance(data.reply.replace(/[#*]/g, "").slice(0, 2500));
          speech.lang = language + "-IN"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech);
        }
      }
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  }
  async function stop() {
    clearTimeout(timer.current);
    const finish = stopRef.current; stopRef.current = null; setRecording(false);
    if (finish) { try { await ask(await finish()); } catch { setError("Recording could not be processed. Please record again or type your question."); } }
  }
  async function start() {
    setError("");
    if (mode === "browser") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { setError("Browser speech recognition is unavailable. Type your question below."); return; }
      const r = new SpeechRecognition(); recognition.current = r; r.lang = language + "-IN";
      r.onresult = e => setText(e.results[0][0].transcript);
      r.onerror = e => setError("Microphone recognition failed: " + e.error);
      r.onend = () => setRecording(false);
      try { r.start(); setRecording(true); } catch { setError("Microphone could not start. Try again or type your question."); } return;
    }
    try { stopRef.current = await recordWav(); setRecording(true); timer.current = setTimeout(stop, 40000); }
    catch { setError("Allow microphone access and use HTTPS or localhost."); }
  }
  return <MainLayout><section className="mx-auto max-w-3xl px-5 py-12">
    <h1 className="text-3xl font-bold">Voice assistant</h1>
    <p className="mt-3 text-slate-600">Ask about business loans, subsidies, eligibility and application documents.</p>
    <p className="my-4 rounded-lg bg-amber-50 p-3 text-sm">Bhashini: {configured ? "credentials configured; provider access checked when you ask" : "not configured"}. Browser microphone support varies by language. Indian-language answers require Bhashini translation.</p>
    <label className="block">Voice provider<select disabled={recording || busy} className="m-3 rounded border p-2" value={mode} onChange={e => setMode(e.target.value)}>
      <option value="browser">Browser microphone</option><option value="bhashini" disabled={!configured}>Bhashini (Indian languages)</option></select></label>
    {<label>Language<select className="m-3 rounded border p-2" value={language} onChange={e => setLanguage(e.target.value)} disabled={recording || busy}>
      {Object.entries({en:"English",hi:"Hindi",bn:"Bengali",ta:"Tamil",te:"Telugu",mr:"Marathi",gu:"Gujarati",kn:"Kannada",ml:"Malayalam",pa:"Punjabi",or:"Odia",ur:"Urdu"}).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label>}
    <div className="my-4 flex gap-3"><button disabled={busy} className="rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50" onClick={recording ? (mode === "browser" ? () => recognition.current?.stop() : stop) : start}>{recording ? "Stop recording" : "Use microphone"}</button>
    <button className="rounded border p-3" onClick={() => { window.speechSynthesis?.cancel(); audioRef.current?.pause(); }}>Stop audio</button></div>
    <label className="block">Your question<textarea className="mt-2 min-h-28 w-full rounded-lg border p-3" value={text} maxLength={2000} onChange={e => setText(e.target.value)} /></label>
    <button className="my-4 rounded-lg bg-[#0d2b55] p-3 text-white disabled:opacity-50" disabled={busy || recording || !text.trim()} onClick={() => ask()}>{busy ? "Getting answer..." : "Ask assistant"}</button>
    {audioRef.current && <button className="m-3 rounded border p-3" onClick={() => audioRef.current.play().catch(() => setError("Audio playback is unavailable."))}>Play answer</button>}
    {error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {reply && <div aria-live="polite" className="rounded-xl border bg-white p-6"><FormattedText content={reply} /></div>}
    <a href="/support" className="mt-6 block underline">Need human help? Open a support ticket</a>
  </section></MainLayout>;
}

