import { MainLayout } from "../layout";
import { hasProfileSession } from "../../lib/schemeProfile";
import { officialSchemeUrl } from "../../lib/citizenProfile";
import { useLanguage } from "../../lib/i18n.jsx";
import { schemeId, useSavedSchemes } from "./SavedSchemesProvider";
import SaveSchemeButton from "./SaveSchemeButton";

export default function SavedSchemesPage() {
  const { t } = useLanguage();
  const { schemes, loading, error, retry } = useSavedSchemes();
  return <MainLayout><main className="mx-auto max-w-5xl px-5 py-10">
    <h1 className="text-2xl font-bold text-[#172b49]">{t("Saved schemes")}</h1>
    {!hasProfileSession() ? <p className="mt-5"><a href="/signin" className="underline">{t("Sign in to view your saved schemes")}</a></p>
      : loading ? <p role="status" className="mt-5">{t("Loading saved schemes…")}</p>
      : error ? <p role="alert" className="mt-5 text-red-700">{error} <button onClick={retry} className="underline">{t("Try again")}</button></p>
      : schemes.length === 0 ? <p className="mt-5 text-slate-600">{t("You have no saved schemes yet.")} <a href="/categories" className="underline">{t("Browse schemes")}</a></p>
      : <div className="mt-6 grid gap-5 md:grid-cols-2">{schemes.map(scheme => <article key={schemeId(scheme)} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-[#172b49]">{scheme.scheme_name || scheme.name}</h2>
        <p className="mt-3 text-sm text-slate-600">{scheme.description}</p>
        <p className="mt-3 text-sm">{scheme.benefits}</p>
        {scheme.available === false ? <p className="mt-4 text-sm text-amber-800">{t("This scheme is no longer in the verified catalogue. Check its current availability before applying.")}</p>
          : officialSchemeUrl(scheme.application_url || scheme.official_url || scheme.official_source_url) && <a className="mt-4 inline-block text-sm underline" href={officialSchemeUrl(scheme.application_url || scheme.official_url || scheme.official_source_url)} target="_blank" rel="noopener noreferrer">{t("Official application guidance")}</a>}
        <SaveSchemeButton scheme={scheme} />
      </article>)}</div>}
  </main></MainLayout>;
}
