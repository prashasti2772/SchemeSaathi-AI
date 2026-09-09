import React, { useEffect, useRef, useState } from "react";
import FormattedText from "./FormattedText";
import { sendAssistantMessage } from "../../lib/api";
import { getUserItem } from "../../lib/userStorage";

const STEP_SUGGESTIONS = {
  1: [
    "What if I don't have a caste certificate?",
    "Special schemes for women or senior citizens",
    "How does state/location affect scheme eligibility?",
  ],
  2: [
    "Manufacturing vs Service: how to categorize my business?",
    "What schemes support new startups & ideas?",
    "Turnover limits for micro and small enterprises",
  ],
  3: [
    "Subsidy vs Loan: which one should I pick?",
    "Are these schemes collateral-free?",
    "What financial documents do I need to keep ready?",
  ],
  4: [
    "Will my profile qualify for PMEGP or Mudra loan?",
    "How does the AI calculate my match score?",
    "Can I update my details later?",
  ],
  5: [
    "How to apply for the top matched scheme?",
    "Where is the official government application portal?",
    "What are the interest subsidy rates?",
  ],
};

const STEP_NAMES = {
  1: "Personal Info",
  2: "Business Details",
  3: "Other Details",
  4: "Review",
  5: "Results",
};

export default function AIHelpModal({ isOpen, onClose, currentStep = 1 }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef(null);

  const stepName = STEP_NAMES[currentStep] || `Step ${currentStep}`;
  const suggestions = STEP_SUGGESTIONS[currentStep] || STEP_SUGGESTIONS[1];

  // Initialize or reload chat history
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = sessionStorage.getItem("schemeSaathiAssistantHistory");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch {
        // Fall back to step welcome message
      }

      setMessages([
        {
          role: "assistant",
          content: `Hi! I'm the SchemeSathi AI Assistant. I see you're on **${stepName}**. Ask me any question about eligibility rules, required certificates, or schemes!`,
        },
      ]);
    }
  }, [isOpen, currentStep, stepName]);

  // Sync back to sessionStorage so full page assistant sees same history
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("schemeSaathiAssistantHistory", JSON.stringify(messages));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenFullPage = () => {
    sessionStorage.setItem("schemeSaathiReturnStep", String(currentStep));
    sessionStorage.setItem("schemeSaathiReturnUrl", window.location.pathname);
    window.location.assign("/ai-assistant");
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || message).trim();
    if (!text || isSending) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setMessage("");
    setIsSending(true);

    try {
      const personal = getUserItem("schemeSaathiPersonalDetails");
      const phoneNumber = personal?.phoneNumber || null;

      const history = nextMessages
        .filter((m) => !m.content.startsWith("Hi! I'm the SchemeSathi AI Assistant") && !m.content.startsWith("Sorry, I couldn't reach"))
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await sendAssistantMessage(text, history, phoneNumber);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.reply,
          schemes: result.retrieved_schemes || [],
        },
      ]);
    } catch (error) {
      console.error("AI Help request failed:", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Sorry, I couldn't reach the assistant right now. Please check your connection and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
      <div className="flex h-[88vh] max-h-175 w-full max-w-160 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0d2b55] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e4b32e] text-sm font-bold text-[#0d2b55]">
              AI
            </div>
            <div>
              <h3 className="text-[13px] font-bold tracking-tight">SchemeSathi AI Help</h3>
              <p className="text-[10px] text-slate-300">
                Context: <span className="font-semibold text-[#e4b32e]">{stepName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenFullPage}
              title="Open in Full Screen"
              className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white transition hover:bg-white/20"
            >
              Full Page ↗
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SUGGESTION CHIPS */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Suggested for {stepName}:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {suggestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 transition hover:border-[#d7aa2d] hover:bg-[#fff9e6] hover:text-[#9b7815]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* CHAT MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#fdfdfd]">
          {messages.map((entry, idx) =>
            entry.role === "user" ? (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[78%] rounded-2xl bg-[#0d2b55] px-4 py-2.5 text-[11px] leading-5 text-white shadow-xs">
                  {entry.content}
                </div>
              </div>
            ) : (
              <div key={idx} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <FormattedText content={entry.content} />

                  {/* SCHEME CARDS */}
                  {entry.schemes?.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#0d2b55]">
                        Matched Schemes ({entry.schemes.length}):
                      </p>
                      <div className="mt-2 space-y-2">
                        {entry.schemes.slice(0, 3).map((s, sIdx) => (
                          <div key={sIdx} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[10px]">
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-[#172b49] line-clamp-1">{s.scheme_name}</span>
                              {s.level && (
                                <span className="rounded bg-white px-1 py-0.2 text-[8px] font-medium text-slate-500">
                                  {s.level}
                                </span>
                              )}
                            </div>
                            {s.benefits && <p className="mt-1 text-slate-600 line-clamp-2">{s.benefits}</p>}
                            {s.official_url && (
                              <a
                                href={s.official_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1.5 inline-block font-semibold text-[#0d2b55] hover:underline"
                              >
                                View Official Portal ↗
                              </a>
                            )}
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
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                <p className="text-[11px] text-slate-400">Thinking...</p>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* INPUT BOX */}
        <div className="border-t border-slate-200 bg-white p-3 sm:px-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything about ${stepName.toLowerCase()} or schemes...`}
              disabled={isSending}
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] text-slate-700 outline-none transition focus:border-[#0d2b55] focus:ring-2 focus:ring-[#0d2b55]/10 disabled:bg-slate-50"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isSending || !message.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e4b32e] text-[#0d2b55] shadow-xs transition hover:bg-[#d7aa2d] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
