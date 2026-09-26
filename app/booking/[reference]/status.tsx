"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/types";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const content = {
  PENDING_APPROVAL: ["Booking request received", "Your time is held while we wait for venue approval."],
  AWAITING_PAYMENT: ["Complete your payment", "Your time is held while you pay with QRIS."],
  PAYMENT_REVIEW: ["Payment submitted", "We’re checking your payment and will update you shortly."],
  CONFIRMED: ["You’re all set!", "Your table is confirmed. See you at the venue."],
  REJECTED: ["Booking declined", "This request could not be accepted. Please choose another time."],
  CANCELLED: ["Booking cancelled", "This booking has been cancelled."],
  EXPIRED: ["Booking expired", "The payment window ended and this time has been released."],
} as const;

export default function BookingStatus({ reference }: { reference: string }) {
  const [booking, setBooking] = useState<PublicBooking>();
  const [remaining, setRemaining] = useState<number>();
  const [error, setError] = useState("");
  const load = useCallback(() => fetch(`/api/bookings/${reference}`).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setBooking(body); setRemaining(body.payment_due_at ? Math.max(0, Math.ceil((new Date(body.payment_due_at).getTime() - Date.now()) / 1000)) : undefined); }).catch(e => setError(e.message)), [reference]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (booking?.status !== "AWAITING_PAYMENT" || !booking.payment_due_at) return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((new Date(booking.payment_due_at!).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) { clearInterval(timer); load(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [booking?.payment_due_at, booking?.status, load]);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const response = await fetch(`/api/bookings/${reference}/payment-proof`, { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json();
    if (!response.ok) return setError(body.error);
    load();
  }
  if (error && !booking) return <section className="card status-card"><div className="notice">{error}</div></section>;
  if (!booking) return <div className="loading">Loading booking…</div>;
  const [title, message] = content[booking.status];
  const failed = ["REJECTED", "CANCELLED", "EXPIRED"].includes(booking.status);
  const phone = booking.settings.whatsapp_number?.replace(/\D/g, "");
  return <section className="card status-card">
    <div className="status-top"><div className={`status-icon ${failed ? "failed" : booking.status === "PENDING_APPROVAL" ? "pending" : ""}`}>{failed ? "×" : "✓"}</div><span className="status-label">{booking.status.replaceAll("_", " ")}</span><h2 style={{ fontSize: 32, marginTop: 13 }}>{title}</h2><p className="summary-date">{message}</p></div>
    <div className="details">
      <div className="detail"><small>Booking ID</small><strong>{booking.booking_reference}</strong></div>
      <div className="detail"><small>Date</small><strong>{new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
      <div className="detail"><small>Time</small><strong>{booking.start_time} — {booking.end_time}</strong></div>
      <div className="detail"><small>Total</small><strong>{money.format(booking.total_amount)}</strong></div>
    </div>
    {booking.status === "AWAITING_PAYMENT" && <div><div className="divider" /><h2 style={{ textAlign: "center" }}>Pay with QRIS</h2>{remaining !== undefined && <p className="payment-timer">Upload within {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}{booking.settings.qris_image_url ? <img className="qris" src={booking.settings.qris_image_url} width="910" height="1280" alt={`QRIS for ${booking.settings.qris_account_name ?? booking.settings.venue_name}`} /> : <div className="notice">The venue is preparing the QRIS image. Please contact them below.</div>}<p style={{ textAlign: "center", color: "var(--muted)" }}>{booking.settings.payment_instructions}</p><form className="upload" onSubmit={upload}><p><strong>Upload payment proof</strong><br/><small>JPG, PNG, WebP, or PDF · max 5 MB</small></p><input required name="receipt" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" /><br/><br/><button className="button">Submit payment</button></form></div>}
    {booking.payment_rejection_reason && <div className="notice">Payment issue: {booking.payment_rejection_reason}</div>}
    {error && <div className="notice">{error}</div>}
    {phone && <div className="action-row" style={{ marginTop: 20 }}><a className="button secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, this is about booking ${booking.booking_reference}.`)}`}>Contact via WhatsApp</a></div>}
  </section>;
}
