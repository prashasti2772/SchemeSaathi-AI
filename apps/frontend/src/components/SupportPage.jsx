import { useCallback, useEffect, useState } from "react";
import { MainLayout } from "./layout";
import { api, apiError } from "../lib/api";
import { useLanguage } from "../lib/i18n.jsx";

const SUPPORT_EMAIL = "customercareprashasti@gmail.com";
const button = "rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} border-[#0d2b55] bg-[#0d2b55] text-white`;

export default function SupportPage() {
  const { t, language } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [accountState, setAccountState] = useState("loading");
  const [notice, setNotice] = useState("");
  const [noticeId, setNoticeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(null);
  const [preview, setPreview] = useState(null);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [savingConsent, setSavingConsent] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsRequested, setSmsRequested] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState("");
  const [smsError, setSmsError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    setTicketError("");
    try { setTickets((await api.get("/citizen/tickets")).data); }
    catch (error) { setTicketError(apiError(error)); }
    finally { setLoadingTickets(false); }
  }, []);

  const loadSms = useCallback(async () => {
    setSmsError("");
    try { setSubscription((await api.get("/citizen/sms-consent")).data); }
    catch (error) { setSmsError(apiError(error)); }
  }, []);

  const loadAccount = useCallback(async () => {
    setAccountState("loading");
    try {
      setUser((await api.get("/citizen/me")).data);
      setAccountState("ready");
      await Promise.allSettled([loadTickets(), loadSms()]);
    } catch (error) {
      setAccountState(error.response?.status === 401 ? "anonymous" : "error");
      if (error.response?.status !== 401) setNotice(apiError(error));
    }
  }, [loadTickets, loadSms]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  function updateTicket(ticket) {
    setTickets(current => [ticket, ...current.filter(item => item.id !== ticket.id)]);
    setTicketError("");
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setNotice(""); setNoticeId("");
    try {
      const { data } = await api.post("/citizen/tickets", Object.fromEntries(new FormData(form)));
      updateTicket(data); setNotice(t("support_ticket_created")); setNoticeId(data.id); form.reset();
    } catch (error) { setNotice(apiError(error)); }
    finally { setBusy(false); }
  }

  async function consent(value) {
    setSavingConsent(true); setNoticeId("");
    try {
      await api.put("/citizen/sms-consent", { consent: value });
      setSubscription(current => ({ ...current, consent: value }));
      setNotice(value ? t("support_sms_opt_in") : t("support_sms_opt_out"));
    } catch (error) { setNotice(apiError(error)); }
    finally { setSavingConsent(false); }
  }

  async function respond(event, ticket, staff) {
    event.preventDefault();
    const form = event.currentTarget;
    setReplying(ticket.id); setNoticeId("");
    try {
      const payload = Object.fromEntries(new FormData(form));
      const { data } = staff
        ? await api.patch(`/citizen/tickets/${ticket.id}`, payload)
        : await api.post(`/citizen/tickets/${ticket.id}/messages`, payload);
      updateTicket(data); form.reset();
      setNotice(staff ? t("support_reply_saved") : t("support_followup_saved"));
    } catch (error) { setNotice(apiError(error)); }
    finally { setReplying(null); }
  }

  async function sendSms() {
    setSendingSms(true); setNoticeId("");
    try {
      await api.post("/citizen/website-sms"); setSmsRequested(true);
      setNotice(t("support_sms_sent"));
    } catch (error) { setNotice(apiError(error)); }
    finally { setSendingSms(false); }
  }

  async function campaign(send = false) {
    if (send && !window.confirm(t("support_campaign_confirm"))) return;
    setCampaignBusy(true); setNoticeId("");
    try {
      if (send) {
        const { data } = await api.post("/citizen/outreach-send");
        setNotice(data.count ? t("support_campaign_sent") : t("support_campaign_empty"));
        setPreview(null);
      } else setPreview((await api.post("/citizen/outreach-preview")).data);
    } catch (error) { setNotice(apiError(error)); }
    finally { setCampaignBusy(false); }
  }

  const staff = ["support", "admin", "operator", "facilitator"].includes(user?.role);
  const statusText = status => ({ open: t("support_status_open"), in_progress: t("support_status_in_progress"), resolved: t("support_status_resolved") }[status] || status);
  const when = date => new Date(date).toLocaleString(language || "en");
  const notificationText = status => ({
    queued: t("support_email_queued"),
    accepted: t("support_email_accepted"),
    failed: t("support_email_failed"),
    unavailable: t("support_email_unavailable"),
  }[status] || "");
  const emailBody = t("support_email_body");

  return (
    <MainLayout>
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0d2b55] to-[#1f4c7a] p-7 text-white shadow-sm">
          <h1 className="text-3xl font-bold">{t("support_title")}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-100">{t("support_intro")}</p>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0d2b55]">{t("support_contact_title")}</h2>
            <p className="mt-4 break-all text-sm text-slate-700">
              <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t("support_email_subject"))}&body=${encodeURIComponent(emailBody)}`}>{SUPPORT_EMAIL}</a>
            </p>
            <p className="mt-3 text-sm text-slate-700"><a className="underline" href="tel:+919653031393">+91 96530 31393</a></p>
            <p className="mt-4 text-sm leading-7 text-slate-600">{t("support_contact_note")}</p>
          </div>

          <div className="grid gap-4">
            <a className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-[#0d2b55] shadow-sm hover:bg-slate-100" href="/ai-assistant">{t("support_assistant_cta")}</a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-[#0d2b55] shadow-sm hover:bg-slate-100" href="/voice-assistant">{t("support_voice_cta")}</a>
          </div>
        </div>

        <div className="space-y-3">
          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-base font-medium text-[#0d2b55]">{t("support_faq_1_q")}</summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{t("support_faq_1_a")}</p>
          </details>
          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-base font-medium text-[#0d2b55]">{t("support_faq_2_q")}</summary>
            <p className="mt-3 text-sm leading-7 text-slate-600">{t("support_faq_2_a")}</p>
          </details>
        </div>

        {notice && <p role="status" className="my-6 break-words rounded-2xl bg-slate-100 p-4 text-sm text-[#0d2b55]">{notice} {noticeId}</p>}
        {accountState === "loading" && <p role="status" className="my-6 text-sm text-slate-600">{t("support_loading")}</p>}
        {accountState === "anonymous" && <a className="my-6 inline-block text-sm font-medium underline text-[#0d2b55]" href="/signin">{t("support_signin_prompt")}</a>}
        {accountState === "error" && <button className={button} onClick={loadAccount}>{t("support_retry")}</button>}

        {accountState === "ready" && (
          <>
            <form onSubmit={submit} className="my-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0d2b55]">{t("support_submit_title")}</h2>
              <p className="text-sm leading-7 text-slate-600">{t("support_submit_note")}</p>
              <label className="block text-sm font-medium text-slate-700">{t("support_subject_label")}
                <input name="subject" required minLength={3} maxLength={150} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#0d2b55]" />
              </label>
              <label className="block text-sm font-medium text-slate-700">{t("support_message_label")}
                <textarea name="message" required minLength={10} maxLength={3000} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#0d2b55]" />
              </label>
              <button disabled={busy} className={primary}>{busy ? t("support_saving") : t("support_submit_button")}</button>
            </form>

            <section className="my-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#0d2b55]">{t("support_sms_title")}</h2>
              {smsError ? (
                <>
                  <p role="alert" className="my-3 text-sm text-red-700">{t(smsError)}</p>
                  <button className={button} onClick={loadSms}>{t("support_sms_retry")}</button>
                </>
              ) : !subscription ? (
                <p className="my-3 text-sm text-slate-600">{t("support_loading_pref")}</p>
              ) : (
                <>
                  <p className="my-3 text-sm leading-7 text-slate-600">{t("support_sms_desc")}</p>
                  <p className="mb-3 text-sm text-slate-500">{subscription.live_enabled ? t("support_sms_limit") : t("support_sms_setup_wait")}</p>
                  <button className={primary} disabled={sendingSms || !subscription.live_enabled || smsRequested} onClick={sendSms}>{sendingSms ? t("support_sending") : smsRequested ? t("support_sms_requested") : t("support_sms_send")}</button>

                  <h3 className="mt-6 text-base font-semibold text-[#0d2b55]">{t("support_consent_title")}</h3>
                  <p role="status" className="my-2 text-sm font-medium text-slate-700">{subscription.consent ? t("support_subscribed") : t("support_not_subscribed")}</p>
                  <p className="my-3 text-sm leading-7 text-slate-600">{t("support_consent_note")}</p>
                  <div className="flex flex-wrap gap-3">
                    <button disabled={savingConsent || subscription.consent} onClick={() => consent(true)} className={button}>{t("support_opt_in")}</button>
                    <button disabled={savingConsent || !subscription.consent} onClick={() => consent(false)} className={button}>{t("support_opt_out")}</button>
                  </div>
                </>
              )}
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#0d2b55]">{staff ? t("support_queue_title") : t("support_tickets_title")}</h2>
              <button disabled={loadingTickets} onClick={loadTickets} className={button}>{loadingTickets ? t("support_loading_tickets") : t("support_refresh_tickets")}</button>
            </div>

            {ticketError && <p role="alert" className="my-4 text-sm text-red-700">{t(ticketError)}</p>}
            {!loadingTickets && !ticketError && tickets.length === 0 && <p className="my-4 text-sm text-slate-600">{t("support_no_tickets")}</p>}

            {tickets.map((ticket) => (
              <article key={ticket.id} className="my-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#0d2b55]">{ticket.subject}</h3>
                <p className="mt-2 break-all text-[11px] text-slate-500">{ticket.id}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{statusText(ticket.status)} · {when(ticket.created_at)}</p>
                <p className="my-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{ticket.message}</p>

                {!!ticket.response && !ticket.replies?.length && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t("support_team_response")} {ticket.response}</p>}

                {ticket.replies?.map((item) => (
                  <div key={item.id} className={`my-3 rounded-xl p-3 ${item.author_role === "citizen" ? "bg-slate-100" : "bg-emerald-50"}`}>
                    <p className="text-sm font-semibold text-slate-700">{item.author_role === "citizen" ? t("support_your_followup") : t("support_team_response")} · {when(item.created_at)}</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{item.message}</p>
                  </div>
                ))}

                {!!ticket.notifications?.length && <p className="my-3 text-xs text-slate-600">{notificationText(ticket.notifications.at(-1).status)}</p>}

                <form onSubmit={(event) => respond(event, ticket, staff)} className="mt-5 border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700">{staff ? t("support_response_label") : t("support_followup_label")}
                    <textarea required name={staff ? "response" : "message"} minLength={3} maxLength={3000} className="mt-1 block w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#0d2b55]" />
                  </label>
                  {staff && (
                    <label className="my-3 block text-sm font-medium text-slate-700">{t("support_status_label")}
                      <select name="status" defaultValue={ticket.status} className="ml-2 rounded-xl border border-slate-300 p-2 text-sm">
                        <option value="open">{t("support_status_open")}</option>
                        <option value="in_progress">{t("support_status_in_progress")}</option>
                        <option value="resolved">{t("support_status_resolved")}</option>
                      </select>
                    </label>
                  )}
                  {!staff && ticket.status === "resolved" && <p className="my-2 text-xs text-slate-600">{t("support_reopen_note")}</p>}
                  <button disabled={replying !== null} className={`${button} mt-3`}>{replying === ticket.id ? t("support_saving") : staff ? t("support_save_response") : t("support_send_followup")}</button>
                </form>
              </article>
            ))}

            {staff && (
              <section className="my-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[#0d2b55]">{t("support_outreach_title")}</h2>
                <button disabled={campaignBusy} className={`${button} my-3`} onClick={() => campaign()}>{campaignBusy ? t("support_wait") : t("support_preview_campaign")}</button>
                {preview && (
                  <>
                    <p className="text-sm leading-7 text-slate-600">{preview.message}</p>
                    <p className="my-3 text-sm text-slate-700">{t("support_recipients")} {preview.recipients}</p>
                    <p className="text-sm text-slate-700">{preview.live_enabled ? t("support_live_enabled") : t("support_preview_only")}</p>
                    {preview.live_enabled && (
                      <button disabled={campaignBusy || !preview.recipients} className={`${button} mt-3`} onClick={() => campaign(true)}>{t("support_send_campaign")}</button>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </MainLayout>
  );
}
