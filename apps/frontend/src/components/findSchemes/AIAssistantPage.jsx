import { useCallback, useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import { FiCamera, FiMic, FiPaperclip, FiSend, FiSquare, FiVolume2 } from "react-icons/fi";
import Header from "../layout/Header";
import FormattedText from "./FormattedText";
import { api, sendAssistantMessage, sendAssistantMessageWithAttachment, synthesizeSpeech, transcribeSpeech } from "../../lib/api";
import { SPEECH_LANGUAGES, browserVoice, watchBrowserVoices, speechText } from "../../lib/speech";
import { useLanguage, LANGUAGES } from "../../lib/i18n.jsx";
import { getUserItem, getCurrentUserId } from "../../lib/userStorage";
import { recordWav } from "../../lib/recordWav";
import copy from "../../lib/chatCopy.json";
import greetings from "../../lib/chatGreetings.json";
import { buildCitizenProfile } from "../../lib/citizenProfile";


const historyKey = () => "schemeSaathiChatV2::" + getCurrentUserId();
function readHistory() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(historyKey()) || "[]");
    return Array.isArray(saved) ? saved.filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-40) : [];
  } catch { return []; }
}
function readProfile() {
  return buildCitizenProfile(...["schemeSaathiPersonalDetails", "schemeSaathiBusinessDetails", "schemeSaathiOtherDetails"].map(k => getUserItem(k) || {}));
}

export default function AIAssistantPage() {
  const { t, language, setLanguage } = useLanguage();
  const ui = copy[language] || copy.en;
  const [messages, setMessages] = useState(readHistory);
  const [message, setMessage] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(null);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [browserVoices, setBrowserVoices] = useState([]);
  const [providerLanguages, setProviderLanguages] = useState(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const recordingRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const audioRef = useRef(null);
  const speechRequestRef = useRef(null);
  const speechEpoch = useRef(0);
  const epoch = useRef(0);
  const cancelVoiceInput = useCallback(() => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) {
      clearTimeout(recording.timer);
      recording.controller.abort();
      recording.stop?.().catch(() => {});
    }
    setListening(false);
    setTranscribing(false);
  }, []);
  const stopPlayback = useCallback(() => {
    speechEpoch.current++;
    speechRequestRef.current?.abort();
    speechRequestRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeakingIndex(null);
  }, []);
  useEffect(() => watchBrowserVoices(window.speechSynthesis, setBrowserVoices), []);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/public/voice/status", { signal: controller.signal, timeout: 30000 })
      .then(({ data }) => {
        if (!controller.signal.aborted) setProviderLanguages(data.configured === false ? [] : data.tts_languages ?? null);
      })
      .catch(() => { /* An unavailable status check is not evidence of language support. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => () => {
    // Prevent old-language recordings or delayed audio from appearing after a switch.
    cancelVoiceInput();
    stopPlayback();
  }, [language, stopPlayback, cancelVoiceInput]);
  useEffect(() => {
    try { sessionStorage.setItem(historyKey(), JSON.stringify(messages.slice(-40))); } catch { /* Storage is optional. */ }
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);
  useEffect(() => () => {
    epoch.current++;
    requestRef.current?.abort();
    cancelVoiceInput();
    stopPlayback();
  }, [stopPlayback, cancelVoiceInput]);

  function newChat() {
    epoch.current++; requestRef.current?.abort(); requestRef.current = null;
    cancelVoiceInput();
    stopPlayback();
    setMessages([]); setMessage(""); setFailed(null); setSending(false); setSelectedImage(null); setImageError(""); setVoiceError(""); setSpeakingIndex(null);
    sessionStorage.removeItem(historyKey()); inputRef.current?.focus();
  }

  async function attachImage(file, captureMode = "") {
    if (!file) return;
    const allowedTypes = ["image/", "application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    const isAllowed = file.type.startsWith("image/") || allowedTypes.includes(file.type) || /\.(pdf|txt|docx|doc)$/i.test(file.name || "");
    if (!isAllowed) {
      setImageError(t("assistant_attachment_choose"));
      return;
    }
    const baseName = file.name || `${captureMode || "attachment"}-upload`;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = file.type.startsWith("image/") ? String(reader.result) : "";
      const initialSelection = { name: baseName, dataUrl, file, ocrText: "", ocrStatus: file.type.startsWith("image/") ? "assistant_attachment_reading" : "" };
      setSelectedImage(initialSelection);
      setImageError("");
      if (file.type.startsWith("image/")) {
        try {
          const result = await Tesseract.recognize(dataUrl, "eng+hin", {
            logger: () => undefined,
          });
          const ocrText = (result?.data?.text || "").trim();
          setSelectedImage(prev => ({ ...prev, ocrText, ocrStatus: ocrText ? "assistant_attachment_extracted" : "assistant_attachment_no_text" }));
        } catch {
          setSelectedImage(prev => ({ ...prev, ocrText: "", ocrStatus: "assistant_attachment_no_text" }));
        }
      }
    };
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
    } else {
      setSelectedImage({ name: baseName, dataUrl: "", file, ocrText: "", ocrStatus: "" });
      setImageError("");
    }
  }

  async function finishVoiceInput(recording) {
    if (recordingRef.current !== recording || !recording.stop) return;
    clearTimeout(recording.timer);
    const stop = recording.stop;
    recording.stop = null;
    setListening(false);
    setTranscribing(true);
    try {
      const audio = await stop();
      if (recordingRef.current !== recording) return;
      const data = await transcribeSpeech(audio, recording.language, recording.controller.signal);
      if (recordingRef.current !== recording) return;
      const transcript = typeof data.transcript === "string" ? data.transcript.trim() : "";
      if (!transcript) throw new Error("No speech received");
      setMessage(prev => {
        const addition = (prev && !/\s$/.test(prev) ? " " : "") + transcript;
        return prev + addition.slice(0, Math.max(0, 2000 - prev.length));
      });
      inputRef.current?.focus();
    } catch {
      if (recordingRef.current === recording) setVoiceError("assistant_voice_input_failed");
    } finally {
      if (recordingRef.current === recording) {
        recordingRef.current = null;
        setTranscribing(false);
      }
    }
  }

  async function startVoiceInput() {
    if (recordingRef.current) {
      if (recordingRef.current.stop) await finishVoiceInput(recordingRef.current);
      else cancelVoiceInput();
      return;
    }
    const recording = { controller: new AbortController(), language, stop: null, timer: null };
    recordingRef.current = recording;
    setVoiceError("");
    setListening(true);
    stopPlayback();
    try {
      const stop = await recordWav();
      // Permission can resolve after navigation, a language change or cancellation.
      if (recordingRef.current !== recording) { await stop(); return; }
      recording.stop = stop;
      recording.timer = setTimeout(() => { void finishVoiceInput(recording); }, 40000);
    } catch {
      if (recordingRef.current === recording) {
        recordingRef.current = null;
        setListening(false);
        setVoiceError("assistant_voice_input_failed");
      }
    }
  }

  async function playReply(entry, index) {
    const spoken = speechText(entry?.content || "");
    if (!spoken) return;

    if (speakingIndex === index) {
      stopPlayback();
      return;
    }

    stopPlayback();
    const playbackEpoch = speechEpoch.current;
    const controller = new AbortController();
    speechRequestRef.current = controller;
    setVoiceError("");
    setSpeakingIndex(index);
    const lang = entry?.language || language;
    const stillCurrent = () => playbackEpoch === speechEpoch.current && !controller.signal.aborted;
    let fallbackStarted = false;

    const browserSpeak = () => {
      if (!stillCurrent() || fallbackStarted) return;
      fallbackStarted = true;
      const synthesis = window.speechSynthesis;
      const voice = browserVoice(synthesis?.getVoices() || [], lang);
      if (!voice || !window.SpeechSynthesisUtterance) {
        setSpeakingIndex(null); setVoiceError("assistant_voice_unavailable"); return;
      }
      try {
        const utterance = new window.SpeechSynthesisUtterance(spoken);
        utterance.lang = SPEECH_LANGUAGES[lang].locale;
        utterance.voice = voice;
        utterance.onend = () => { if (stillCurrent()) setSpeakingIndex(null); };
        utterance.onerror = () => { if (stillCurrent()) { setSpeakingIndex(null); setVoiceError("assistant_voice_unavailable"); } };
        synthesis.speak(utterance);
      } catch { setSpeakingIndex(null); setVoiceError("assistant_voice_unavailable"); }
    };

    try {
      // Bhashini is tried first for every supported language, including English.
      if (!SPEECH_LANGUAGES[lang] || (providerLanguages && !providerLanguages.includes(lang))) { browserSpeak(); return; }
      const data = await synthesizeSpeech(spoken, SPEECH_LANGUAGES[lang].bhashini, controller.signal);
      if (!stillCurrent()) return;
      if (!data.audio_base64) { browserSpeak(); return; }
      const audio = new Audio(`data:${data.audio_mime_type || "audio/wav"};base64,${data.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => { if (stillCurrent()) setSpeakingIndex(null); };
      audio.onerror = browserSpeak;
      await audio.play();
    } catch {
      browserSpeak();
    }
  }

  async function send(text = message, retry = false) {
    let requestText = (typeof text === "string" ? text : message).trim();
    const ocrText = selectedImage?.ocrText?.trim();
    if (selectedImage) {
      const attachmentNote = `Attachment: ${selectedImage.name}`;
      if (ocrText) {
        requestText = requestText ? `${requestText}\n\n${attachmentNote}\nOCR text:\n${ocrText}` : `${attachmentNote}\nOCR text:\n${ocrText}`;
      } else {
        requestText = requestText ? `${requestText}\n\n${attachmentNote}` : attachmentNote;
      }
    }
    if ((!requestText && !selectedImage) || requestText.length > 2000 || requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller;
    const currentEpoch = epoch.current;
    const history = (retry ? messages.slice(0, -1) : messages).map(({role, content}) => ({role, content}));
    if (!retry) setMessages(items => [...items, {role:"user", content:requestText}]);
    const attachmentFile = selectedImage?.file || null;
    setMessage(""); setSelectedImage(null); setImageError(""); setSending(true); setFailed(null);
    try {
      const result = attachmentFile
        ? await sendAssistantMessageWithAttachment(requestText, attachmentFile, history, null, readProfile(), language, controller.signal)
        : await sendAssistantMessage(requestText, history, null, readProfile(), language, controller.signal);
      if (currentEpoch !== epoch.current) return;
      setMessages(items => [...items, {role:"assistant", content:result.reply, language:result.language || language, schemes:result.retrieved_schemes || []}]);
    } catch (e) {
      if (currentEpoch === epoch.current && e.code !== "ERR_CANCELED") setFailed(requestText);
    } finally {
      if (currentEpoch === epoch.current) { setSending(false); requestRef.current = null; inputRef.current?.focus(); }
    }
  }

  const canSpeak = lang => Boolean(SPEECH_LANGUAGES[lang]) && (providerLanguages === null
    || providerLanguages.includes(lang) || Boolean(browserVoice(browserVoices, lang)));

  return <div className="min-h-screen bg-[#f4f6fa] text-[#172b49]">
    <Header />
    <div className="mx-auto flex max-w-7xl gap-4 px-4 py-5 sm:px-6">
      <aside className="hidden w-64 shrink-0 rounded-2xl bg-[#0d2b55] p-5 text-white shadow-sm lg:block">
        <button onClick={newChat} className="w-full rounded-xl border border-[#d7aa2d] px-4 py-3 font-semibold transition hover:bg-white/10">+ {ui.newChat}</button>
        <p className="mt-8 text-sm leading-6 text-slate-200">{ui.intro}</p>
        <div className="mt-5 space-y-3">{ui.suggestions.map(q => <button key={q} disabled={sending} onClick={() => send(q)} className="w-full rounded-xl bg-white/10 p-3 text-left text-sm leading-6 transition hover:bg-white/20 disabled:opacity-50">{q}</button>)}</div>
        <p className="mt-10 text-xs leading-5 text-slate-300">{ui.guide}</p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="border-l-4 border-[#d7aa2d] pl-3">
            <h1 className="text-xl font-bold text-[#0d2b55]">{t("assistant_title")}</h1>
            <p className="mt-1 text-sm text-slate-500">{ui.intro}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">{ui.language}<select aria-label={ui.language} value={language} onChange={e => setLanguage(e.target.value)} className="ml-2 max-w-44 rounded-lg border border-slate-300 bg-white p-2 outline-none focus:border-[#d7aa2d]">{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
            <button onClick={newChat} className="rounded-lg border border-[#0d2b55] px-3 py-2 text-sm text-[#0d2b55] lg:hidden">{ui.newChat}</button>
          </div>
        </div>

        <div ref={logRef} role="log" aria-label={t("assistant_conversation")} aria-live="polite" aria-relevant="additions" className="h-[55dvh] min-h-[390px] overflow-y-auto overscroll-contain bg-white p-4 sm:h-[58dvh] sm:p-6">
          <div className="mb-5 max-w-2xl rounded-2xl border border-[#ead58e] bg-[#fffaf0] p-4 text-sm leading-7" lang={language}>{greetings[language] || greetings.en}</div>
          {messages.map((entry, i) => <div key={i} className={entry.role === "user" ? "mb-5 flex justify-end" : "mb-5"}>
            <div data-testid={entry.role === "assistant" ? "assistant-message" : "user-message"} lang={entry.language} className={`max-w-2xl break-words rounded-2xl p-4 sm:p-5 ${entry.role === "user" ? "max-w-[90%] whitespace-pre-wrap bg-[#0d2b55] text-sm leading-7 text-white" : "border border-slate-200 bg-[#f8f9fc] [&_p]:text-sm [&_span]:text-sm [&>div]:text-sm [&>div]:leading-7"}`}>
              {entry.role === "user" ? entry.content : <FormattedText content={entry.content} />}
              {entry.schemes?.length > 0 && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">{ui.sources} ({entry.schemes.length})</summary><ul className="mt-3 space-y-2 text-sm">{entry.schemes.map(s => <li key={s.scheme_name}>{/^https?:\/\//i.test(s.official_url || "") ? <a className="underline" target="_blank" rel="noopener noreferrer" href={s.official_url}>{s.scheme_name}</a> : s.scheme_name}</li>)}</ul></details>}
              {entry.role === "assistant" && <div className="mt-3 flex justify-end border-t border-slate-200 pt-2">
                <button type="button" data-testid="read-answer" onClick={() => playReply(entry, i)} disabled={speakingIndex !== i && !canSpeak(entry.language || language)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0d2b55] transition hover:bg-[#fff3ca] disabled:cursor-not-allowed disabled:opacity-40" title={t(speakingIndex === i ? "assistant_voice_stop" : canSpeak(entry.language || language) ? "assistant_voice_read" : "assistant_voice_unavailable")} aria-label={t(speakingIndex === i ? "assistant_voice_stop" : canSpeak(entry.language || language) ? "assistant_voice_read" : "assistant_voice_unavailable")}>
                  {speakingIndex === i ? <FiSquare size={16} /> : <FiVolume2 size={18} />}
                </button>
              </div>}
            </div>
          </div>)}
          {sending && <p role="status" className="p-3 text-sm text-slate-600">{ui.sending}</p>}
          {failed && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{ui.error} <button onClick={() => send(failed, true)} className="ml-2 font-semibold underline">{ui.retry}</button></div>}
          {voiceError && <div role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t(voiceError)}</div>}
        </div>

        <div className="border-t border-slate-200 bg-[#fbfcfe] p-4 sm:px-6">
          {messages.length === 0 && <div className="mb-4 flex flex-wrap gap-2 lg:hidden">{ui.suggestions.map(q => <button disabled={sending} onClick={() => send(q)} key={q} className="rounded-full border bg-white px-3 py-2 text-left text-xs">{q}</button>)}</div>}
          {selectedImage && <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
            <div className="flex min-w-0 items-center gap-3">
              {selectedImage.dataUrl ? <img src={selectedImage.dataUrl} alt={selectedImage.name} className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-lg">📄</div>}
              <div className="min-w-0"><span className="block truncate text-sm font-medium text-slate-700">{selectedImage.name}</span>{selectedImage.ocrStatus && <span className="block text-xs text-slate-500">{t(selectedImage.ocrStatus)}</span>}</div>
            </div>
            <button type="button" className="text-sm font-semibold text-[#0d2b55]" onClick={() => setSelectedImage(null)}>{t("assistant_attachment_remove")}</button>
          </div>}
          {imageError && <p className="mb-3 text-sm text-red-700">{imageError}</p>}

          <form onSubmit={e => {e.preventDefault(); send();}} className="rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-[#d7aa2d]">
            <label className="sr-only" htmlFor="assistant-question">{ui.question}</label>
            <textarea id="assistant-question" ref={inputRef} value={message} maxLength={2000} rows={2} onChange={e => setMessage(e.target.value)} onKeyDown={e => {if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); send();}}} placeholder={ui.placeholder} className="block min-h-16 w-full resize-none border-0 bg-transparent px-3 py-2 font-normal leading-6 outline-none" />
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-2">
              <div className="flex items-center gap-1">
                <button type="button" data-testid="assistant-microphone" onClick={startVoiceInput} disabled={(sending && !listening) || transcribing} className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-40 ${listening ? "bg-[#d7aa2d] text-[#0d2b55]" : "text-[#0d2b55] hover:bg-[#fff3ca]"}`} title={t(listening ? "assistant_voice_stop_listening" : "assistant_voice_mic")} aria-label={t(listening ? "assistant_voice_stop_listening" : "assistant_voice_mic")}>{listening ? <FiSquare size={17} /> : <FiMic size={19} />}</button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#0d2b55] transition hover:bg-[#fff3ca]" title={t("assistant_attachment_add")} aria-label={t("assistant_attachment_add")} onClick={() => galleryInputRef.current?.click()}><FiPaperclip size={19} /></button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#0d2b55] transition hover:bg-[#fff3ca]" title={t("assistant_attachment_camera")} aria-label={t("assistant_attachment_camera")} onClick={() => cameraInputRef.current?.click()}><FiCamera size={19} /></button>
                {listening && <span className="ml-2 text-xs font-medium text-[#0d2b55]">{t("assistant_voice_listening")}</span>}
              </div>
              <button type="submit" disabled={sending || (!message.trim() && !selectedImage)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0d2b55] px-4 text-sm font-semibold text-white transition hover:bg-[#123c72] disabled:cursor-not-allowed disabled:opacity-40"><span className="hidden sm:inline">{ui.send}</span><FiSend size={17} /></button>
            </div>
          </form>

          <div className="hidden">
            <input ref={galleryInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={e => attachImage(e.target.files?.[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => attachImage(e.target.files?.[0], "camera")} />
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">{t("assistant_tools_hint")}</p>
        </div>
      </main>
    </div>
  </div>;
}
