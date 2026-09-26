"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BookingActions({ id, status, confirmationWhatsAppUrl }: { id: number; status: string; confirmationWhatsAppUrl: string }) {
  const router = useRouter(); const [error, setError] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false);
  async function act(action: string) { setBusy(true); setError(""); const response = await fetch(`/api/admin/bookings/${id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); const body = await response.json(); setBusy(false); if (!response.ok) return setError(body.error); if (action === "confirm-payment") return window.location.assign(confirmationWhatsAppUrl); router.refresh(); }
  return <div style={{ display: "grid", gap: 10 }}>
    {status === "PENDING_APPROVAL" && <><button className="button" disabled={busy} onClick={() => act("approve")}>Approve booking</button><label className="field">Rejection note<input value={reason} onChange={e => setReason(e.target.value)} /></label><button className="button danger" disabled={busy} onClick={() => act("reject")}>Reject booking</button></>}
    {status === "PAYMENT_REVIEW" && <><button className="button" disabled={busy} onClick={() => act("confirm-payment")}>Confirm & message on WhatsApp</button><label className="field">Reason<input value={reason} onChange={e => setReason(e.target.value)} placeholder="Incorrect amount, unreadable…" /></label><button className="button danger" disabled={busy || !reason} onClick={() => act("reject-payment")}>Reject payment</button></>}
    {!['REJECTED','CANCELLED','EXPIRED'].includes(status) && <button className="button secondary" disabled={busy} onClick={() => act("cancel")}>Cancel booking</button>}
    {error && <div className="notice">{error}</div>}
  </div>;
}
