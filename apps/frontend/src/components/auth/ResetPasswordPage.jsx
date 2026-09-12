import { useEffect } from "react";
import ForgotPasswordPage from "./ForgotPasswordPage";

// Recovery now requires email OTP verification. Legacy URL tokens are never used.
export default function ResetPasswordPage() {
  useEffect(() => {
    window.history.replaceState(null, "", "/forgot-password");
  }, []);
  return <ForgotPasswordPage />;
}
