// Wizard data is stored locally and scoped to the signed-in account.
export function getCurrentUserId() {
  try {
    const raw = sessionStorage.getItem("schemeSaathiUser");
    const isLoggedIn = sessionStorage.getItem("schemeSaathiLoggedIn") === "true";
    if (!isLoggedIn || !raw) return "guest";

    const user = JSON.parse(raw);
    return user?.mobile || user?.email || "guest";
  } catch {
    return "guest";
  }
}

function scopedKey(baseKey) {
  return `${baseKey}::${getCurrentUserId()}`;
}

export function getUserItem(baseKey) {
  try {
    const raw = localStorage.getItem(scopedKey(baseKey));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`Unable to read ${baseKey}:`, error);
    return null;
  }
}

export function setUserItem(baseKey, value) {
  localStorage.setItem(scopedKey(baseKey), JSON.stringify(value));
}

export function removeUserItem(baseKey) {
  localStorage.removeItem(scopedKey(baseKey));
}

export function hasCompletedWizardProfile() {
  const personal = getUserItem("schemeSaathiPersonalDetails");
  return Boolean(personal?.phoneNumber);
}
