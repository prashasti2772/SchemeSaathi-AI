import { useState } from "react";
import { FiClock, FiInbox, FiRefreshCw } from "react-icons/fi";
import { api, apiError } from "../lib/api";
import { useLanguage } from "../lib/i18n.jsx";

export const supportButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#0d2b55] transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#96712f] disabled:cursor-not-allowed disabled:opacity-50";
export const supportPrimary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#0d2b55] bg-[#0d2b55] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19436f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#96712f] disabled:cursor-not-allowed disabled:opacity-50";
export const supportField = "mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-900 outline-none focus:border-[#96712f] focus:ring-2 focus:ring-[#d5ae58]/25 disabled:opacity-60";
const statusStyle = { open: "border-amber-200 bg-amber-50 text-amber-900", in_progress: "border-blue-200 bg-blue-50 text-blue-900", resolved: "border-emerald-200 bg-emerald-50 text-emerald-900" };

export function SupportTickets({ tickets, loading, error, onRefresh, onUpdate, hasMore, onLoadMore, managing = false }) {
  const { t } = useLanguage();
  return <section aria-labelledby={managing ? "support-queue-title" : "support-history-title"}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id={managing ? "support-queue-title" : "support-history-title"} className="text-xl font-bold text-[#0d2b55]">{t(managing ? "support_queue_title" : "support_tickets_title")}</h2><button type="button" disabled={loading} onClick={onRefresh} className={supportButton}><FiRefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />{t(loading ? "support_loading_tickets" : "support_refresh_tickets")}</button></div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t(error)}</p>}
    {loading && <p role="status" className="my-4 text-sm text-slate-600">{t("support_loading_tickets")}</p>}
    {!loading && !error && tickets.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center"><FiInbox size={28} className="mx-auto mb-3 text-[#96712f]" aria-hidden="true" /><p className="font-semibold text-[#0d2b55]">{t("support_no_tickets")}</p><p className="mt-2 text-sm text-slate-600">{t(managing ? "support_queue_empty_note" : "support_empty_note")}</p></div>}
    <div className="space-y-5">{tickets.map(ticket => <TicketConversation key={ticket.id} ticket={ticket} managing={managing} onUpdate={onUpdate} />)}</div>
    {hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className={`${supportButton} mt-5`}>{t("support_load_more")}</button>}
  </section>;
}

function TicketConversation({ ticket, managing, onUpdate }) {
  const { t, language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const when = value => {
    if (!value) return "—";
    const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(language || "en", { dateStyle: "medium", timeStyle: "short" });
  };
  const statusLabel = value => t({ open: "support_status_open", in_progress: "support_status_in_progress", resolved: "support_status_resolved" }[value] || "support_status_open");
  async function respond(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const message = (managing ? payload.response : payload.message).trim();
    setError(""); setNotice("");
    if ((!managing || message) && message.length < 3) { setError(t("support_reply_validation")); return; }
    if (managing && !message && payload.status === ticket.status) { setError(t("support_update_validation")); return; }
    setSaving(true);
    try {
      const { data } = managing ? await api.patch(`/citizen/tickets/${ticket.id}`, { status: payload.status, ...(message ? { response: message } : {}) }) : await api.post(`/citizen/tickets/${ticket.id}/messages`, { message });
      onUpdate(data); form.reset();
      setNotice(t(managing ? "support_reply_saved" : "support_followup_saved"));
    } catch (cause) { setError(apiError(cause)); }
    finally { setSaving(false); }
  }
  const notification = { queued: "support_email_queued", accepted: "support_email_accepted", failed: "support_email_failed", unavailable: "support_email_unavailable" }[ticket.notifications?.at(-1)?.status];
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words text-lg font-bold text-[#0d2b55]">{ticket.subject}</h3><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[ticket.status] || statusStyle.open}`}>{statusLabel(ticket.status)}</span></div>
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-6 text-slate-500"><span className="break-all">{t("support_ticket_id")}: {ticket.id}</span><span className="inline-flex items-center gap-1.5"><FiClock aria-hidden="true" />{t("support_created_label")}: {when(ticket.created_at)}</span></div>
    {managing && ticket.owner && <p className="mt-3 break-words rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">{t("support_requested_by")}: </span>{ticket.owner.fullName || ticket.owner.email}<span className="block break-all text-xs leading-6 text-slate-500">{ticket.owner.email}</span></p>}
    <p className="my-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{ticket.message}</p>
    {!!ticket.replies?.length && <h4 className="mb-3 text-sm font-semibold text-[#0d2b55]">{t("support_conversation_title")}</h4>}
    {!!ticket.response && !ticket.replies?.length && <div className="rounded-xl border border-[#e7d8b6] bg-[#fcf8ee] p-4"><p className="text-xs font-semibold text-[#0d2b55]">{t("support_team_response")}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{ticket.response}</p></div>}
    {ticket.replies?.map(reply => <div key={reply.id} className={`my-3 rounded-xl border p-4 ${reply.author_role === "citizen" ? "border-slate-200 bg-slate-50" : "border-[#e7d8b6] bg-[#fcf8ee]"}`}><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-[#0d2b55]">{t(reply.author_role === "citizen" ? managing ? "support_requester_followup" : "support_your_followup" : "support_team_response")}</span><span className="text-slate-500">{when(reply.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{reply.message}</p></div>)}
    {notification && <p className="mt-4 text-xs leading-6 text-slate-500">{t(notification)}</p>}
    <form onSubmit={respond} className="mt-5 border-t border-slate-200 pt-5">
      <label className="block text-sm font-semibold text-slate-700">{t(managing ? "support_response_label" : "support_followup_label")}<textarea required={!managing} name={managing ? "response" : "message"} minLength={3} maxLength={3000} rows={3} disabled={saving} className={supportField} /></label>
      {managing && <div className="mt-3"><p className="text-xs leading-6 text-slate-500">{t("support_status_only_note")}</p><label className="mt-3 block max-w-xs text-sm font-semibold text-slate-700">{t("support_status_label")}<select key={`${ticket.id}-${ticket.status}`} name="status" defaultValue={ticket.status} disabled={saving} className={supportField}>{["open", "in_progress", "resolved"].map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label></div>}
      {!managing && ticket.status === "resolved" && <p className="mt-3 text-xs leading-6 text-slate-500">{t("support_reopen_note")}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{t(error)}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      <button disabled={saving} className={`${supportPrimary} mt-4`}>{t(saving ? "support_saving" : managing ? "support_save_response" : "support_send_followup")}</button>
    </form>
  </article>;
}
