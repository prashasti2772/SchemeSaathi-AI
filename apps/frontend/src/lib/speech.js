// The same ISO language code is sent to chat and Bhashini. Browser APIs need a locale.
export const SPEECH_LANGUAGES = Object.freeze({
  en: { locale: "en-IN", bhashini: "en" },
  hi: { locale: "hi-IN", bhashini: "hi" },
  mr: { locale: "mr-IN", bhashini: "mr" },
  bn: { locale: "bn-IN", bhashini: "bn" },
  gu: { locale: "gu-IN", bhashini: "gu" },
  ta: { locale: "ta-IN", bhashini: "ta" },
  te: { locale: "te-IN", bhashini: "te" },
  kn: { locale: "kn-IN", bhashini: "kn" },
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
