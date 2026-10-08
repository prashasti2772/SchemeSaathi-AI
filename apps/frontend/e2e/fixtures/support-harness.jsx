// Mount the retained conversation component without changing production routes.
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SupportTickets } from "../../src/components/SupportTickets.jsx";
import { LanguageProvider } from "../../src/lib/i18n.jsx";
import { api, apiError } from "../../src/lib/api.js";

function Harness() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setTickets((await api.get("/citizen/tickets")).data); }
    catch (failure) { setError(apiError(failure)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <SupportTickets tickets={tickets} loading={loading} error={error}
    managing={new URLSearchParams(location.search).get("role") === "support"}
    onRefresh={refresh} onUpdate={updated => setTickets(current => current.map(ticket => ticket.id === updated.id ? updated : ticket))}
    hasMore={false} />;
}

createRoot(document.getElementById("root")).render(<LanguageProvider><Harness /></LanguageProvider>);
