import { useEffect, useRef, useState } from "react";
import Header from "../layout/Header";
import FormattedText from "./FormattedText";
import { sendAssistantMessage } from "../../lib/api";
import { useLanguage, LANGUAGES } from "../../lib/i18n.jsx";
import { getUserItem, getCurrentUserId } from "../../lib/userStorage";
import copy from "../../lib/chatCopy.json";
import greetings from "../../lib/chatGreetings.json";

const historyKey = () => "schemeSaathiChatV2::" + getCurrentUserId();
function readHistory() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(historyKey()) || "[]");
    return Array.isArray(saved) ? saved.filter(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-40) : [];
  } catch { return []; }
}
function readProfile() {
  return Object.assign({}, ...["schemeSaathiPersonalDetails", "schemeSaathiBusinessDetails", "schemeSaathiOtherDetails"].map(k => getUserItem(k) || {}));
}

export default function AIAssistantPage() {
  const { t, language, setLanguage } = useLanguage();
  const ui = copy[language] || copy.en;
  const [messages, setMessages] = useState(readHistory);
  const [message, setMessage] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);
  const epoch = useRef(0);
  useEffect(() => {
    try { sessionStorage.setItem(historyKey(), JSON.stringify(messages.slice(-40))); } catch { /* Storage is optional. */ }
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, sending]);
  useEffect(() => () => { epoch.current++; requestRef.current?.abort(); }, []);

  function newChat() {
    epoch.current++; requestRef.current?.abort(); requestRef.current = null;
    setMessages([]); setMessage(""); setFailed(null); setSending(false);
    sessionStorage.removeItem(historyKey()); inputRef.current?.focus();
  }
  async function send(text = message, retry = false) {
    text = text.trim();
    if (!text || text.length > 2000 || requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller;
    const currentEpoch = epoch.current;
    const history = (retry ? messages.slice(0, -1) : messages).map(({role, content}) => ({role, content}));
    if (!retry) setMessages(items => [...items, {role:"user", content:text}]);
    setMessage(""); setSending(true); setFailed(null);
    try {
      const result = await sendAssistantMessage(text, history, null, readProfile(), language, controller.signal);
      if (currentEpoch !== epoch.current) return;
      setMessages(items => [...items, {role:"assistant", content:result.reply, language:result.language || language, schemes:result.retrieved_schemes || []}]);
    } catch (e) {
      if (currentEpoch === epoch.current && e.code !== "ERR_CANCELED") setFailed(text);
    } finally {
      if (currentEpoch === epoch.current) { setSending(false); requestRef.current = null; inputRef.current?.focus(); }
    }
  }

  return <div className="min-h-screen bg-[#f6f7fa] text-[#172b49]">
    <Header />
    <div className="mx-auto flex max-w-7xl gap-5 px-4 py-5 sm:px-6">
      <aside className="hidden w-64 shrink-0 rounded-2xl bg-[#0d2b55] p-5 text-white lg:block">
        <button onClick={newChat} className="w-full rounded-lg border border-[#d7aa2d] px-4 py-3 font-semibold">+ {ui.newChat}</button>
        <p className="mt-8 text-sm leading-6 text-slate-200">{ui.intro}</p>
        <div className="mt-5 space-y-3">{ui.suggestions.map(q => <button key={q} disabled={sending} onClick={() => send(q)} className="w-full rounded-lg bg-white/10 p-3 text-left text-sm leading-6 hover:bg-white/20 disabled:opacity-50">{q}</button>)}</div>
        <p className="mt-10 text-xs leading-5 text-slate-300">{ui.guide}</p>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-6">
          <div><h1 className="text-xl font-bold">{t("assistant_title")}</h1><p className="mt-1 text-sm text-slate-500">{ui.intro}</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">{ui.language}<select aria-label={ui.language} value={language} onChange={e => setLanguage(e.target.value)} className="ml-2 max-w-44 rounded-lg border p-2">{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label>
            <button onClick={newChat} className="rounded-lg border px-3 py-2 text-sm lg:hidden">{ui.newChat}</button>
          </div>
        </div>
        <div ref={logRef} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" className="h-[52dvh] min-h-72 overflow-y-auto overscroll-contain p-4 sm:h-[58dvh] sm:p-6">
          <div className="mb-5 max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm leading-7" lang={language}>{greetings[language] || greetings.en}</div>
          {messages.map((entry, i) => <div key={i} className={entry.role === "user" ? "mb-5 flex justify-end" : "mb-5"}>
            <div data-testid={entry.role === "assistant" ? "assistant-message" : "user-message"} lang={entry.language} className={`max-w-2xl break-words rounded-2xl p-4 sm:p-5 ${entry.role === "user" ? "max-w-[90%] whitespace-pre-wrap bg-[#0d2b55] text-sm leading-7 text-white" : "border bg-[#f8f9fc] [&_p]:text-sm [&_span]:text-sm [&>div]:text-sm [&>div]:leading-7"}`}>
              {entry.role === "user" ? entry.content : <FormattedText content={entry.content} />}
              {entry.schemes?.length > 0 && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">{ui.sources} ({entry.schemes.length})</summary><ul className="mt-3 space-y-2 text-sm">{entry.schemes.map(s => <li key={s.scheme_name}>{/^https?:\/\//i.test(s.official_url || "") ? <a className="underline" target="_blank" rel="noopener noreferrer" href={s.official_url}>{s.scheme_name}</a> : s.scheme_name}</li>)}</ul></details>}
            </div>
          </div>)}
          {sending && <p role="status" className="p-3 text-sm text-slate-600">{ui.sending}</p>}
          {failed && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{ui.error} <button onClick={() => send(failed, true)} className="ml-2 font-semibold underline">{ui.retry}</button></div>}
        </div>
        <div className="border-t p-4 sm:px-6">
          {messages.length === 0 && <div className="mb-4 flex flex-wrap gap-2 lg:hidden">{ui.suggestions.map(q => <button disabled={sending} onClick={() => send(q)} key={q} className="rounded-full border bg-slate-50 px-3 py-2 text-left text-xs">{q}</button>)}</div>}
          <form onSubmit={e => {e.preventDefault(); send();}} className="flex items-end gap-3">
            <label className="min-w-0 flex-1 text-sm font-medium">{ui.question}<textarea ref={inputRef} value={message} maxLength={2000} rows={2} onChange={e => setMessage(e.target.value)} onKeyDown={e => {if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault(); send();}}} placeholder={ui.placeholder} className="mt-2 block w-full resize-y rounded-xl border p-3 font-normal leading-6 outline-none focus:border-[#0d2b55]" /></label>
            <button type="submit" disabled={sending || !message.trim()} className="mb-1 rounded-xl bg-[#0d2b55] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{ui.send}</button>
          </form>
          <a href="/voice-assistant" className="mt-3 inline-block text-xs underline">{ui.voice}</a>
        </div>
      </main>
    </div>
  </div>;
}
