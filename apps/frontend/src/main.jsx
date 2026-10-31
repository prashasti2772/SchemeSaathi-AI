import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { LanguageProvider } from "./lib/i18n.jsx";
import { SavedSchemesProvider } from "./components/schemes/SavedSchemesProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <SavedSchemesProvider><App /></SavedSchemesProvider>
    </LanguageProvider>
  </StrictMode>
);
