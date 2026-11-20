import { createContext, useContext, useEffect, useState } from "react";
import { api, apiError } from "../../lib/api";
import { hasProfileSession } from "../../lib/schemeProfile";

const SavedSchemesContext = createContext(null);
export const schemeId = scheme => scheme.scheme_id || scheme.slug || scheme.id;

export function SavedSchemesProvider({ children }) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(hasProfileSession);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!hasProfileSession()) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get("/citizen/saved-schemes", { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setSchemes(data.schemes || []);
    }).catch(error => {
      if (!controller.signal.aborted) setError(apiError(error));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function toggle(scheme) {
    const id = schemeId(scheme);
    const exists = schemes.some(item => schemeId(item) === id);
    if (exists) {
      await api.delete(`/citizen/saved-schemes/${encodeURIComponent(id)}`);
      setSchemes(current => current.filter(item => schemeId(item) !== id));
    } else {
      await api.put(`/citizen/saved-schemes/${encodeURIComponent(id)}`);
      setSchemes(current => [...current.filter(item => schemeId(item) !== id), scheme]);
    }
  }
  return <SavedSchemesContext.Provider value={{ schemes, loading, error, toggle, retry: () => setAttempt(value => value + 1) }}>{children}</SavedSchemesContext.Provider>;
}
export const useSavedSchemes = () => useContext(SavedSchemesContext);
