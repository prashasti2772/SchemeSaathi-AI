import { MainLayout } from "./layout";

export default function AdminSupportPage() {
  return (
    <MainLayout>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c99400]">
            SchemeSaathi
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#0d2b55]">
            Support management
          </h1>

          <p className="mt-3 text-slate-600">
            Support-ticket management is available only to authorized staff accounts.
          </p>
        </section>
      </main>
    </MainLayout>
  );
}
