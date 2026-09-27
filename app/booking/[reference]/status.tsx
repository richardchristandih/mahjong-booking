"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PublicBooking } from "@/lib/types";

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const recentBookingKey = "mahjong-recent-booking";
const content = {
  PENDING_APPROVAL: ["Booking request received", "Your time is held while we wait for venue approval."],
  AWAITING_PAYMENT: ["Complete your payment", "Your time is held while you pay with QRIS."],
  PAYMENT_REVIEW: ["Payment submitted", "We’re checking your payment and will update you shortly."],
  CONFIRMED: ["You’re all set!", "Your table is confirmed. See you at the venue."],
  REJECTED: ["Booking declined", "This request could not be accepted. Please choose another time."],
  CANCELLED: ["Booking cancelled", "This booking has been cancelled."],
  EXPIRED: ["Booking expired", "The payment window ended and this time has been released."],
} as const;

function bookingDate(booking: PublicBooking) {
  return new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let nextY = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, nextY);
      line = word;
      nextY += lineHeight;
    } else {
      line = test;
    }
  }

  if (line) ctx.fillText(line, x, nextY);
  return nextY + lineHeight;
}

function drawFittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size = 38) {
  let fontSize = size;
  do {
    ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
    fontSize -= 2;
  } while (ctx.measureText(text).width > maxWidth && fontSize >= 24);

  ctx.fillText(text, x, y);
}

function saveConfirmationImage(booking: PublicBooking, title: string, message: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffdf8";
  ctx.strokeStyle = "#dfe4df";
  ctx.lineWidth = 3;
  ctx.roundRect(90, 90, 900, 1170, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#c79943";
  ctx.font = "700 30px Inter, Arial, sans-serif";
  ctx.fillText("THE MAHJONG ROOM", 150, 180);

  ctx.fillStyle = "#174f41";
  ctx.font = "700 66px Georgia, serif";
  ctx.fillText(title, 150, 285);

  ctx.fillStyle = "#6f7772";
  ctx.font = "32px Inter, Arial, sans-serif";
  drawWrappedText(ctx, message, 150, 345, 780, 42);

  const rows = [
    ["Booking ID", booking.booking_reference],
    ["Name", booking.customer_name],
    ["Date", bookingDate(booking)],
    ["Time", `${booking.start_time} — ${booking.end_time}`],
    ["Status", booking.status.replaceAll("_", " ")],
    ["Total", money.format(booking.total_amount)],
  ];

  let y = 455;
  for (const [label, value] of rows) {
    ctx.fillStyle = "#6f7772";
    ctx.font = "26px Inter, Arial, sans-serif";
    ctx.fillText(label, 150, y);
    ctx.fillStyle = "#16362e";
    drawFittedText(ctx, value, 150, y + 48, 780);
    y += 145;
  }

  ctx.fillStyle = "#edf3ef";
  ctx.roundRect(150, 1110, 780, 78, 24);
  ctx.fill();
  ctx.fillStyle = "#174f41";
  ctx.font = "700 24px Inter, Arial, sans-serif";
  ctx.fillText("Save this image or booking ID to check your status later.", 180, 1160);

  const link = document.createElement("a");
  link.download = `${booking.booking_reference}-confirmation.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function BookingStatus({ reference }: { reference: string }) {
  const [booking, setBooking] = useState<PublicBooking>();
  const [remaining, setRemaining] = useState<number>();
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const load = useCallback(() => fetch(`/api/bookings/${reference}`).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setBooking(body); setRemaining(body.payment_due_at ? Math.max(0, Math.ceil((new Date(body.payment_due_at).getTime() - Date.now()) / 1000)) : undefined); }).catch(e => setError(e.message)), [reference]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!booking) return;

    window.localStorage.setItem(recentBookingKey, JSON.stringify({
      reference: booking.booking_reference,
      date: booking.booking_date,
      start: booking.start_time,
      end: booking.end_time,
      status: booking.status,
    }));
  }, [booking]);
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
  async function copyLink() {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setSaveMessage("Booking link copied. Keep it somewhere easy to find.");
    } catch {
      setSaveMessage(link);
    }
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
      <div className="detail"><small>Date</small><strong>{bookingDate(booking)}</strong></div>
      <div className="detail"><small>Time</small><strong>{booking.start_time} — {booking.end_time}</strong></div>
      <div className="detail"><small>Total</small><strong>{money.format(booking.total_amount)}</strong></div>
    </div>
    <div className="save-panel">
      <div>
        <h2>Save your booking info</h2>
        <p>Keep this booking ID or confirmation image. You can check the latest status anytime from the homepage.</p>
      </div>
      <div className="save-code"><span>Booking ID</span><strong>{booking.booking_reference}</strong></div>
      <div className="action-row">
        <button className="button" type="button" onClick={() => saveConfirmationImage(booking, title, message)}>Save confirmation image</button>
        <button className="button secondary" type="button" onClick={copyLink}>Copy status link</button>
      </div>
      {saveMessage && <div className="notice success">{saveMessage}</div>}
    </div>
    {booking.status === "AWAITING_PAYMENT" && <div><div className="divider" /><h2 style={{ textAlign: "center" }}>Pay with QRIS</h2>{remaining !== undefined && <p className="payment-timer">Upload within {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}{booking.settings.qris_image_url ? <img className="qris" src={booking.settings.qris_image_url} width="910" height="1280" alt={`QRIS for ${booking.settings.qris_account_name ?? booking.settings.venue_name}`} /> : <div className="notice">The venue is preparing the QRIS image. Please contact them below.</div>}<p style={{ textAlign: "center", color: "var(--muted)" }}>{booking.settings.payment_instructions}</p><form className="upload" onSubmit={upload}><p><strong>Upload payment proof</strong><br/><small>JPG, PNG, WebP, or PDF · max 5 MB</small></p><input required name="receipt" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" /><br/><br/><button className="button">Submit payment</button></form></div>}
    {booking.payment_rejection_reason && <div className="notice">Payment issue: {booking.payment_rejection_reason}</div>}
    {error && <div className="notice">{error}</div>}
    {phone && <div className="action-row" style={{ marginTop: 20 }}><a className="button secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello, this is about booking ${booking.booking_reference}.`)}`}>Contact via WhatsApp</a></div>}
  </section>;
}
