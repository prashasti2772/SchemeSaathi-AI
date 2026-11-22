// The same ISO language code is sent to chat and Bhashini. Browser APIs need a locale.
export const SPEECH_LANGUAGES = Object.freeze({
  en: { locale: "en-IN", bhashini: "en", sarvam: "en-IN" },
  hi: { locale: "hi-IN", bhashini: "hi", sarvam: "hi-IN" },
  mr: { locale: "mr-IN", bhashini: "mr", sarvam: "mr-IN" },
  bn: { locale: "bn-IN", bhashini: "bn", sarvam: "bn-IN" },
  gu: { locale: "gu-IN", bhashini: "gu", sarvam: "gu-IN" },
  ta: { locale: "ta-IN", bhashini: "ta", sarvam: "ta-IN" },
  te: { locale: "te-IN", bhashini: "te", sarvam: "te-IN" },
  kn: { locale: "kn-IN", bhashini: "kn", sarvam: "kn-IN" },
  ml: { locale: "ml-IN", bhashini: "ml", sarvam: "ml-IN" },
  pa: { locale: "pa-IN", bhashini: "pa", sarvam: "pa-IN" },
  or: { locale: "or-IN", bhashini: "or", sarvam: "od-IN" },
  od: { locale: "od-IN", bhashini: "od", sarvam: "od-IN" },
  ur: { locale: "ur-IN", bhashini: "ur", sarvam: "ur-IN" },
});

const normalize = value => String(value || "").replaceAll("_", "-").toLowerCase();

export function browserVoice(voices, language) {
  const locale = SPEECH_LANGUAGES[language]?.locale;
  if (!locale) return null;
  // Never let the browser silently read an Indic answer with its default English voice.
  return voices.find(voice => normalize(voice.lang) === normalize(locale))
    || voices.find(voice => normalize(voice.lang).split("-")[0] === language)
    || null;
}

export function watchBrowserVoices(synthesis, onChange) {
  if (!synthesis) { onChange([]); return () => {}; }
  const update = () => onChange(synthesis.getVoices());
  synthesis.addEventListener("voiceschanged", update);
  update(); // Some browsers load voices now; others populate them asynchronously.
  return () => synthesis.removeEventListener("voiceschanged", update);
}

export function speechText(value = "") {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);
}
