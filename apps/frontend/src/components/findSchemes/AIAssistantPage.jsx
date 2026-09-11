import React, { useEffect, useRef, useState } from "react";
import FormattedText from "./FormattedText";
import Header from "../layout/Header";
import { Footer } from "../layout";
import { sendAssistantMessage, apiError } from "../../lib/api";
import { useLanguage, LANGUAGES } from "../../lib/i18n.jsx";
import { getUserItem, getCurrentUserId } from "../../lib/userStorage";

import { FaMicrophone } from "react-icons/fa";

const STORAGE_KEY = "schemeSaathiAssistantHistory::" + getCurrentUserId();

function loadHistory() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getStoredProfile() {
  try {
    const personal = getUserItem("schemeSaathiPersonalDetails") || {};
    const business = getUserItem("schemeSaathiBusinessDetails") || {};
    const other = getUserItem("schemeSaathiOtherDetails") || {};
    return { ...personal, ...business, ...other };
  } catch {
    return null;
  }
}

function getPhoneNumber() {
  try {
    const personal = getUserItem("schemeSaathiPersonalDetails");
    return personal?.phoneNumber || null;
  } catch {
    return null;
  }
}

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Namaste! I am your SchemeSathi AI Assistant, grounded in over 650+ Indian Government welfare schemes.\n\nAsk me anything about:\n- Eligibility criteria for specific schemes\n- Subsidies and loan amounts\n- Step-by-step application process\n- Required documents checklist\n\nHow can I help you today?",
  schemes: [],
};

const suggestedQuestions = [
  "Tell me about PMEGP subsidy and loan",
  "How to apply for Stand-Up India?",
  "Schemes for women entrepreneurs",
  "What documents are needed for PM MUDRA Yojana?",
  "Subsidies for agriculture and dairy farming",
];

function formatInline(str) {
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = str.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        return (
          <a
            key={i}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline hover:text-blue-800 break-all"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    return part;
  });
}

function FormattedContent({ text }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="mt-3 mb-1.5 border-b border-slate-200 pb-1 text-[12px] font-bold tracking-tight text-[#0d2b55]"
            >
              {trimmed.replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (trimmed === "---") {
          return <hr key={idx} className="my-2 border-slate-200" />;
        }

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const content = isBullet ? trimmed.substring(2) : trimmed;
        const parsedContent = formatInline(content);

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="mt-0.5 font-bold text-[#d7aa2d]">•</span>
              <span className="flex-1 text-[11px] leading-5 text-slate-700">
                {parsedContent}
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-[11px] leading-5 text-slate-700">
            {parsedContent}
          </p>
        );
      })}
    </div>
  );
}

export default function AIAssistantPage() {
  const { t, language: preferredLanguage } = useLanguage();
  const [chatLanguage, setChatLanguage] = useState(preferredLanguage || "en");
  const [message, setMessage] = useState(new URLSearchParams(window.location.search).get("q") || "");
  const [messages, setMessages] = useState(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [WELCOME_MESSAGE];
  });
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openVoiceAssistant = () => {
    window.location.assign("/voice-assistant");
  };

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleSend = async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : message).trim();
    if (!text || isSending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setMessage("");
    setIsSending(true);

    try {
      const history = messages
        .filter((m) => m !== WELCOME_MESSAGE && !m.content.startsWith("Sorry, I couldn't reach"))
        .map((m) => ({ role: m.role, content: m.content }));

      const profile = getStoredProfile();
      const result = await sendAssistantMessage(text, history, getPhoneNumber(), profile, chatLanguage);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.reply,
          schemes: result.retrieved_schemes || [],
        },
      ]);
    } catch (error) {
      console.error("Assistant request failed:", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            apiError(error),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestion = (question) => {
    handleSend(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#172b49]">
      {/* ======== MAIN NAVBAR ====== */}
      <Header />

      {/* ============= AI ASSISTANT AREA ============= */}
      <div
        className="
          flex
          h-[calc(100vh-70px)]
          min-h-150
          w-full
          overflow-hidden
          bg-white
        "
      >
        {/* ======== LEFT SIDEBAR ====== */}
        <aside
          className="
            hidden
            w-64
            shrink-0
            flex-col
            bg-[#0d2b55]
            text-white
            md:flex
          "
        >
          {/* ================= NEW CHAT ================= */}
          <div className="px-6 pt-10">
            <button
              type="button"
              onClick={handleNewChat}
              className="
                flex
                h-10.5
                w-full
                items-center
                justify-center
                rounded-lg
                border
                border-[#d7aa2d]
                bg-[#0d2b55]
                text-[12px]
                font-medium
                text-white
                transition
                hover:bg-[#173b70]
              "
            >
              + New Chat
            </button>
          </div>

          {/* ================= SUGGESTED QUESTIONS ================= */}
          <div className="px-6 pt-8">
            <p
              className="
                text-[11px]
                font-semibold
                tracking-wider
                text-[#e4b32e]
                uppercase
              "
            >
              Popular Inquiries
            </p>

            <div className="mt-4 space-y-3">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestion(question)}
                  className="
                    block
                    w-full
                    rounded-md
                    bg-white/5
                    p-2.5
                    text-left
                    text-[11px]
                    leading-snug
                    text-white/90
                    transition
                    hover:bg-white/10
                    hover:text-[#e4b32e]
                  "
                >
                  💬 {question}
                </button>
              ))}
            </div>
          </div>

          {/* ================= STATS BADGE ================= */}
          <div className="mt-auto p-6 text-[10px] text-slate-400 border-t border-white/10">
            <p className="font-semibold text-slate-300">🏛️ SchemeSathi AI</p>
            <p className="mt-1">Searches the supplied scheme catalogue. Verify current official guidelines.</p>
          </div>
        </aside>

        {/* ============= MAIN CHAT AREA ============= */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* ============ CHAT HEADER =========== */}
          <div className="px-7 pt-5 pb-3 border-b border-slate-100 sm:px-9 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h1
                className="
                  text-[19px]
                  font-extrabold
                  tracking-[-0.02em]
                  text-[#172b49]
                "
              >
                {t("assistant_title")}
                <label className="ml-4 inline-block text-sm font-normal">Chat language
                  <select className="ml-2 rounded border p-2" value={chatLanguage} disabled={isSending} onChange={e => {setChatLanguage(e.target.value); handleNewChat();}}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
              </h1>
              <p
                className="
                  mt-0.5
                  text-[10px]
                  text-slate-500
                "
              >
                Government Scheme Advisor • Instant eligibility, benefits, and application support
              </p>
            </div>

            <button
              type="button"
              onClick={openVoiceAssistant}
              className="
                flex
                items-center
                gap-2
                rounded-lg
                border
                border-[#d7aa2d]
                bg-[#fdfaf2]
                px-3
                py-1.5
                text-[11px]
                font-semibold
                text-[#0d2b55]
                transition
                hover:bg-[#fbf4de]
              "
            >
              <FaMicrophone className="text-[#d7aa2d]" />
              <span>Voice Mode</span>
            </button>
          </div>

          {/* ============= CHAT MESSAGES ============= */}
          <div
            className="
              flex
              flex-1
              flex-col
              overflow-y-auto
              px-7
              pt-4
              sm:px-9
            "
          >
            {messages.map((entry, index) =>
              entry.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div
                    className="
                      mb-5
                      max-w-[70%]
                      rounded-2xl
                      bg-[#0d2b55]
                      px-5
                      py-3
                      text-[11px]
                      leading-5
                      text-white
                      shadow-sm
                    "
                  >
                    {entry.content}
                  </div>
                </div>
              ) : (
                <div key={index} className="mb-5">
                  <div
                    className="
                      max-w-[85%]
                      rounded-2xl
                      border
                      border-slate-200
                      bg-[#f8f9fc]
                      px-6
                      py-5
                      shadow-sm
                    "
                  >
                    <FormattedText content={entry.content} />

                    {/* ATTACHED SCHEME CARDS */}
                    {entry.schemes?.length > 0 && (
                      <div className="mt-4 border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d2b55]">
                          Official Schemes Referenced ({entry.schemes.length})
                        </p>
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                          {entry.schemes.map((s, sIdx) => (
                            <div
                              key={sIdx}
                              className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:border-[#d7aa2d]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[11px] font-bold text-[#172b49] line-clamp-2">
                                  {s.scheme_name}
                                </h4>
                                {s.level && (
                                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                                    {s.level}
                                  </span>
                                )}
                              </div>
                              {s.benefits && (
                                <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-2">
                                  {s.benefits}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                {s.official_url ? (
                                  <a
                                    href={s.official_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-semibold text-[#0d2b55] hover:underline"
                                  >
                                    Official Portal ↗
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Government Portal</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSuggestion(`Tell me eligibility and documents for ${s.scheme_name}`)}
                                  className="text-[9px] font-medium text-[#9b7815] hover:underline"
                                >
                                  Ask Eligibility →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {isSending && (
              <div className="mb-5">
                <div className="inline-block max-w-[72%] rounded-2xl border border-slate-200 bg-[#f8f9fc] px-6 py-4 shadow-sm">
                  <p className="text-[11px] leading-5 text-slate-400 animate-pulse">
                    Consulting scheme database...
                  </p>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* ======= MESSAGE INPUT ======= */}
          <div
            className="
              px-7
              pb-4
              pt-2
              sm:px-9
              border-t
              border-slate-100
            "
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("assistant_placeholder")}
                disabled={isSending}
                className="
                  h-11.25
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-5
                  text-[11px]
                  text-slate-700
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-[#0d2b55]
                  focus:ring-2
                  focus:ring-[#0d2b55]/10
                  disabled:bg-slate-50
                "
              />

              <button
                type="button"
                onClick={openVoiceAssistant}
                title="Open Voice Assistant"
                className="
                  flex
                  h-11.25
                  w-11.25
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-[#d7aa2d]
                  bg-white
                  text-[12px]
                  font-semibold
                  text-[#0d2b55]
                  hover:bg-[#fbf4de]
                  transition
                "
              >
                <FaMicrophone />
              </button>

              {/* SEND BUTTON */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isSending || !message.trim()}
                className="
                  flex
                  h-11.25
                  w-11.25
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#e4b32e]
                  text-[#0d2b55]
                  shadow-sm
                  transition
                  hover:bg-[#d7aa2d]
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                aria-label="Send message"
              >
                ➤
              </button>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
