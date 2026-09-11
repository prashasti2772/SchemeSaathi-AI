import { useEffect, useState } from "react";
import { MainLayout } from "./layout";
import { api, apiError } from "../lib/api";
export default function SupportPage() {
  const [tickets, setTickets] = useState([]); const [user, setUser] = useState(null);
  const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [savingConsent, setSavingConsent] = useState(false);
  const load = () => api.get("/citizen/tickets").then(({data}) => setTickets(data));
  useEffect(() => { api.get("/citizen/me").then(({data}) => { setUser(data); return Promise.all([load(), api.get("/citizen/sms-consent").then(({data}) => setSubscription(data))]); }).catch(() => setNotice("Sign in to create and track support tickets.")); }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); const form = e.currentTarget;
    try { const {data} = await api.post("/citizen/tickets", Object.fromEntries(new FormData(form))); setNotice("Ticket created: " + data.id); form.reset(); await load(); }
    catch(e) { setNotice(apiError(e)); } finally { setBusy(false); }
  }
  async function consent(value) {
    setSavingConsent(true);
    try { await api.put("/citizen/sms-consent", {consent:value}); setSubscription(s => ({...s, consent:value})); setNotice(value ? "You opted in to website awareness SMS. No message has been sent." : "You opted out of future SMS outreach."); }
    catch(e) { setNotice(apiError(e)); } finally { setSavingConsent(false); }
  }
  async function respond(e, id) {
    e.preventDefault();
    try { await api.patch("/citizen/tickets/" + id, Object.fromEntries(new FormData(e.currentTarget))); await load(); setNotice("Response saved."); }
    catch(e) { setNotice(apiError(e)); }
  }
  const staff = user && user.role !== "citizen";
  return <MainLayout><section className="mx-auto max-w-4xl px-5 py-12">
    <h1 className="text-3xl font-bold">Support & assistance</h1>
    <p className="my-3 text-slate-600">Get help with scheme discovery, documents, account access or a website problem. This project helpdesk is managed by the student team; it is not a government helpline.</p>
    <div className="my-5 rounded-xl border bg-white p-5"><h2 className="text-lg font-bold">Contact the SchemeSaathi team</h2><p className="mt-2"><a className="underline" href={"mailto:srivastava2722@gmail.com?subject="+encodeURIComponent("SchemeSaathi Support Request")+"&body="+encodeURIComponent("Dear SchemeSaathi Support Team,\n\nI require assistance with:\nScheme name or page URL:\nIssue and steps tried:\nExpected result:\n\nPlease advise on the next steps.\n\nRegards,\nName:")}>srivastava2722@gmail.com</a></p><p className="mt-2"><a className="underline" href="tel:+919653031393">+91 96530 31393</a></p><p className="mt-2 text-sm text-slate-500">Email assistance: include the scheme name or page URL, a description of the issue and steps already tried. Telephone assistance: call the number above. Ticket assistance: sign in below to receive and track a written response. Response times depend on team availability.</p></div>
    <div className="my-6 grid gap-4 sm:grid-cols-2"><a className="rounded-xl border bg-white p-5" href="/ai-assistant">Ask the scheme assistant →</a><a className="rounded-xl border bg-white p-5" href="/voice-assistant">Use voice assistance →</a></div>
    <details className="my-3 rounded border bg-white p-4"><summary>Does a match guarantee a loan or benefit?</summary><p className="mt-3">No. Results screen the recorded criteria. The department or lender checks all current requirements and makes the final decision.</p></details>
    <details className="my-3 rounded border bg-white p-4"><summary>Where do I apply?</summary><p className="mt-3">Open the official link on your scheme card and follow the application instructions. Never share an OTP, password or bank PIN here.</p></details>
    <p role="status" className="my-5 text-sm text-[#0d2b55]">{notice}</p>
    {!user ? <a className="underline" href="/signin">Sign in to contact support</a> : <>
    <form onSubmit={submit} className="my-6 space-y-3 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">Submit a support request</h2><p className="text-sm text-slate-600">Include the affected page, scheme name and steps that caused the issue. Do not include passwords, OTPs, Aadhaar numbers or bank details.</p>
      <label className="block">Subject<input name="subject" required minLength={3} maxLength={150} className="mt-1 block w-full rounded border p-3" /></label>
      <label className="block">Describe the issue<textarea name="message" required minLength={10} maxLength={3000} className="mt-1 min-h-28 w-full rounded border p-3" /></label>
      <button disabled={busy} className="rounded bg-[#0d2b55] p-3 text-white">{busy ? "Saving..." : "Submit ticket"}</button>
    </form>
    <section className="my-6 rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">Website awareness SMS</h2><p role="status" className="my-2 font-medium">{subscription ? (subscription.consent ? "Subscribed" : "Not subscribed") : "Loading preference..."}</p><p className="text-sm text-slate-600">{subscription?.live_enabled ? "SMS outreach is enabled for subscribed users." : "SMS delivery is not enabled yet. Your preference can still be saved."}</p><p className="my-3">Choose whether the project team may send a website link to your registered mobile number. You can opt out here anytime.</p>
      <button disabled={savingConsent || !subscription || subscription.consent} onClick={() => consent(true)} className="mr-3 rounded border p-3">Opt in to SMS</button><button disabled={savingConsent || !subscription || !subscription.consent} onClick={() => consent(false)} className="rounded border p-3">Opt out</button></section>
    <h2 className="text-xl font-bold">{staff ? "Helpdesk queue" : "Your tickets"}</h2>
    {tickets.length === 0 && <p className="my-3">No tickets yet.</p>}
    {tickets.map(ticket => <article key={ticket.id} className="my-4 rounded-xl border bg-white p-5">
      <h3 className="font-bold">{ticket.subject}</h3><p className="text-xs text-slate-500">{ticket.id} · {ticket.status.replaceAll("_", " ")} - {new Date(ticket.created_at).toLocaleString()}</p><p className="my-3 whitespace-pre-wrap">{ticket.message}</p>
      {ticket.response && <p className="rounded bg-emerald-50 p-3">Team response: {ticket.response}</p>}
      {staff && <form onSubmit={e => respond(e,ticket.id)} className="mt-3"><label>Response<textarea required name="response" minLength={3} className="block w-full rounded border p-2" /></label><label>Status<select name="status" className="m-2 rounded border p-2"><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="open">Open</option></select></label><button className="rounded border p-2">Save response</button></form>}
    </article>)}
    {staff && <section className="my-6 rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">Outreach</h2>
      <button className="my-3 rounded border p-3" onClick={async () => { try { setPreview((await api.post("/citizen/outreach-preview")).data); } catch(e) { setNotice(apiError(e)); } }}>Preview campaign</button>
      {preview && <><p>{preview.message}</p><p>{preview.recipients} opted-in recipients. {preview.live_enabled ? "Live sending enabled." : "Preview only; live sending is disabled."}</p>
      {preview.live_enabled && <button className="mt-3 rounded border p-3" onClick={async () => { if (!window.confirm("Send the configured SMS template to opted-in recipients who have not received it?")) return; try { const {data} = await api.post("/citizen/outreach-send"); setNotice(data.status + ": " + data.count); } catch(e) { setNotice(apiError(e)); } }}>Send approved campaign</button>}</>}
    </section>}
    </>}
  </section></MainLayout>;
}

