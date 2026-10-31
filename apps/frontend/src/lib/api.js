import axios from "axios";

/* Base URL comes from the Vite env so each environment (dev/staging/prod)
   can point at its own backend without touching this file. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});
const sessionApi = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let refreshPending = null;
let sessionVersion = 0;

/* Submits the wizard's collected profile and returns explainable scheme
   matches from the real Eligibility Engine. */
export async function fetchMatchingSchemes(profilePayload) {
  const response = await api.post("/public/self-service/schemes-match", profilePayload);
  return response.data;
}

/* Sends message and history to the SchemeSathi AI Chatbot (FAISS RAG + Gemini)
   and returns { reply: string, retrieved_schemes: array }. */
export async function sendAssistantMessage(message, history = [], phoneNumber = null, profile = null, language = "en", signal) {
  const response = await api.post("/public/self-service/assistant-chat", {
    message,
    language,
    history: history.slice(-20),
    phone_number: phoneNumber || null,
    profile: profile || null,
  }, { timeout: 60000, signal });
  return response.data;
}

export async function transcribeSpeech(audioBase64, language = "en", signal) {
  const response = await api.post("/public/voice/transcribe", {
    audio_base64: audioBase64,
    language,
  }, { timeout: 60000, signal });
  return response.data;
}

export async function synthesizeSpeech(text, language = "en", signal) {
  const response = await api.post("/public/voice/tts", {
    text,
    language,
  }, { timeout: 60000, signal });
  return response.data;
}

export async function sendAssistantMessageWithAttachment(message, file, history = [], phoneNumber = null, profile = null, language = "en", signal) {
  const form = new FormData();
  form.append("message", message || "");
  form.append("language", language || "en");
  form.append("history", JSON.stringify(history.slice(-20)));
  form.append("phone_number", phoneNumber || "");
  if (profile) form.append("profile", JSON.stringify(profile));
  if (file) form.append("file", file, file.name || "attachment");

  const response = await api.post("/public/self-service/assistant-chat/upload", form, {
    timeout: 60000,
    signal,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/* Retrieves 100% eligible schemes for the profile */
export async function fetchEligibleSchemes(profilePayload) {
  const response = await api.post("/eligibility/eligible", profilePayload);
  return response.data;
}

/* Obtains Explainable AI breakdown for top matching scheme */
export async function explainScheme(profilePayload) {
  const response = await api.post("/eligibility/explain", profilePayload);
  return response.data;
}

/* Semantic search against 653 government schemes */
export async function searchSchemesSemantically(query, topK = 5) {
  const response = await api.get("/chatbot/search", {
    params: { q: query, top_k: topK },
  });
  return response.data;
}

/* Fetches catalog schemes filtered by category or query */
export async function fetchCatalogSchemes(query = "", limit = 50, offset = 0, category = "") {
  const response = await api.get("/eligibility/schemes", {
    params: { query: query || undefined, category: category || undefined, limit, offset },
  });
  return response.data;
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("schemeSaathiToken");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
export function saveSession(data) {
  if (!data.access_token || !data.user) throw new Error("Incomplete authentication response");
  sessionVersion += 1;
  sessionStorage.setItem("schemeSaathiToken", data.access_token);
  sessionStorage.setItem("schemeSaathiUser", JSON.stringify({ ...data.user, fullName: data.user.fullName || data.user.full_name }));
  sessionStorage.setItem("schemeSaathiLoggedIn", "true");
  if (data.refresh_token) sessionStorage.setItem("schemeSaathiRefreshToken", data.refresh_token);
  else sessionStorage.removeItem("schemeSaathiRefreshToken");
}

export function clearSession() {
  sessionVersion += 1;
  for (const key of ["schemeSaathiToken", "schemeSaathiRefreshToken", "schemeSaathiUser", "schemeSaathiLoggedIn"]) sessionStorage.removeItem(key);
}

export async function logoutSession() {
  const refreshToken = sessionStorage.getItem("schemeSaathiRefreshToken");
  clearSession();
  if (!refreshToken) return;
  try {
    await sessionApi.post("/auth/logout", { refresh_token: refreshToken }, { timeout: 3000 });
  } catch {
    // Local credentials are removed even when the server is unreachable.
  }
}

api.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  const authenticationRoute = /^\/(?:auth\/|citizen\/(?:login|register|resend-login-otp|verify-login-otp|forgot-password|verify-reset-otp|reset-password)(?:$|\?))/;
  if (error.response?.status !== 401 || !request || request._sessionRetry || !request.headers?.Authorization || authenticationRoute.test(request.url)) throw error;
  request._sessionRetry = true;
  const currentAccess = sessionStorage.getItem("schemeSaathiToken");
  // A concurrent request may already have completed the refresh.
  if (currentAccess && request.headers.Authorization !== `Bearer ${currentAccess}`) return api(request);
  const refreshToken = sessionStorage.getItem("schemeSaathiRefreshToken");
  if (!refreshToken) { clearSession(); throw error; }
  if (!refreshPending) {
    const version = sessionVersion;
    refreshPending = sessionApi.post("/auth/refresh", { refresh_token: refreshToken }).then(({ data }) => {
      // Signing out or switching accounts while refreshing must not restore a session.
      if (version !== sessionVersion) throw error;
      saveSession(data);
    }).catch((failure) => {
      if (version === sessionVersion && [401, 403].includes(failure.response?.status)) clearSession();
      throw failure;
    }).finally(() => { refreshPending = null; });
  }
  await refreshPending;
  return api(request);
});
export function apiError(error) {
  if (!error.response) {
    return error.code === "ECONNABORTED" || error.code === "ETIMEDOUT"
      ? "The service took too long to respond. Please try again."
      : "Unable to connect to the website service. Please try again in a moment.";
  }
  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const issue = detail[0];
    const field = String(issue.loc?.at(-1) || "Input").replaceAll("_", " ");
    return `${field}: ${issue.msg || "Please check this field."}`;
  }
  return error.response.data?.message || "We could not complete your request. Please try again.";
}

// Remove the legacy demo account, which could include a plaintext password.
localStorage.removeItem("schemeSaathiUser");
localStorage.removeItem("schemeSaathiLoggedIn");
