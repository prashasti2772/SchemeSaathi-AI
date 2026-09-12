import axios from "axios";

/* Base URL comes from the Vite env so each environment (dev/staging/prod)
   can point at its own backend without touching this file. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

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
export async function fetchCatalogSchemes(query = "", limit = 50, offset = 0) {
  const response = await api.get("/eligibility/schemes", {
    params: { query: query || undefined, limit, offset },
  });
  return response.data;
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("schemeSaathiToken");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
export function saveSession(data) {
  sessionStorage.setItem("schemeSaathiToken", data.access_token);
  sessionStorage.setItem("schemeSaathiUser", JSON.stringify(data.user));
  sessionStorage.setItem("schemeSaathiLoggedIn", "true");
}
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
