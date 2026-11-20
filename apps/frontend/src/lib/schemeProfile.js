import { api } from "./api";
import { getCurrentUserId, getUserItem, setUserItem } from "./userStorage";

export const PROFILE_KEYS = {
  personal: "schemeSaathiPersonalDetails",
  business: "schemeSaathiBusinessDetails",
  other: "schemeSaathiOtherDetails",
};
export function hasProfileSession() {
  return sessionStorage.getItem("schemeSaathiLoggedIn") === "true" && Boolean(sessionStorage.getItem("schemeSaathiToken"));
}
function cacheProfile(data, owner) {
  if (getCurrentUserId() !== owner) return;
  for (const [section, key] of Object.entries(PROFILE_KEYS)) {
    if (data[section]) setUserItem(key, Object.fromEntries(Object.entries(data[section]).map(([field, value]) => [field, value ?? ""])));
  }
}
export async function loadSchemeProfile(signal) {
  if (!hasProfileSession()) return;
  const owner = getCurrentUserId();
  let { data } = await api.get("/citizen/scheme-profile", { signal });
  if (getCurrentUserId() !== owner) return;
  // Migrate this account's existing browser answers once, without replacing
  // answers already stored on the server or copying another account's draft.
  if (!data.exists) {
    const local = Object.fromEntries(Object.entries(PROFILE_KEYS).map(([section, key]) => [section, getUserItem(key)]).filter(([, value]) => value && Object.keys(value).length));
    if (Object.keys(local).length) ({ data } = await api.patch("/citizen/scheme-profile", local, { signal }));
  }
  if (data.exists) cacheProfile(data, owner);
}
export async function saveSchemeProfileSection(section, answers) {
  const owner = getCurrentUserId();
  const normalized = { ...answers };
  for (const key of ["annualIncome", "annualTurnover", "numberOfEmployees"]) {
    if (key in normalized && !String(normalized[key] ?? "").trim()) normalized[key] = null;
  }
  if (hasProfileSession()) {
    const { data } = await api.patch("/citizen/scheme-profile", { [section]: normalized });
    cacheProfile(data, owner);
  } else {
    setUserItem(PROFILE_KEYS[section], answers);
  }
}
