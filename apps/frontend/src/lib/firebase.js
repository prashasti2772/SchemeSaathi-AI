// Public Firebase web configuration is fetched at runtime, so Render environment
// changes do not require rebuilding the frontend. Private credentials never enter JS.
import { api } from "./api";
let verifier;
let configPromise;
export async function phoneCaptcha(language = "en") {
  const { data } = await api.get("/citizen/phone-config");
  if (!data.enabled) return null;
  if (!configPromise) configPromise = Promise.all([import("firebase/app"), import("firebase/auth")]);
  const [appSdk, authSdk] = await configPromise;
  const app = appSdk.getApps().find(item => item.name === "phone-verification") || appSdk.initializeApp(data.config, "phone-verification");
  const auth = authSdk.getAuth(app);
  auth.languageCode = language;
  if (verifier) { verifier.clear(); verifier = null; }
  const container = document.getElementById("phone-recaptcha");
  if (!container) throw new Error("Phone verification is unavailable. Reload the page and try again.");
  verifier = new authSdk.RecaptchaVerifier(auth, container, { size: "invisible" });
  try { return await verifier.verify(); }
  catch { throw new Error("Complete the phone verification CAPTCHA and try again."); }
}
