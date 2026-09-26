"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Slot } from "@/lib/types";

type Availability = { date: string; opening_time: string; closing_time: string; hourly_rate: number; slots: Slot[] };
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function iso(date: Date) { return date.toLocaleDateString("en-CA"); }
function timeMinutes(time: string) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }

export default function BookingForm() {
  const router = useRouter();
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);
  const [date, setDate] = useState(iso(dates[0]));
  const [availability, setAvailability] = useState<Availability>();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/availability?date=${date}`).then(async r => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setAvailability(body);
    }).catch(e => setError(e.message));
  }, [date]);

  function chooseDate(nextDate: string) {
    setSelected([]); setAvailability(undefined); setError(""); setDate(nextDate);
  }

  function toggle(slot: Slot) {
    if (slot.status !== "available") return;
    if (selected.includes(slot.start)) {
      const sorted = [...selected].sort();
      if (slot.start !== sorted[0] && slot.start !== sorted.at(-1)) return;
      setSelected(selected.filter(s => s !== slot.start));
      return;
    }
    if (!selected.length) return setSelected([slot.start]);
    const starts = [...selected, slot.start].sort();
    const consecutive = starts.every((s, i) => i === 0 || timeMinutes(s) - timeMinutes(starts[i - 1]) === 60);
    if (consecutive) setSelected(starts);
  }

  const chosen = [...selected].sort();
  const start = chosen[0];
  const end = start && availability?.slots.find(s => s.start === chosen.at(-1))?.end;
  const total = (availability?.hourly_rate ?? 0) * chosen.length;
  const friendlyDate = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSending(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), phone: data.get("phone"), date, start_time: start, end_time: end }) });
    const body = await response.json(); setSending(false);
    if (!response.ok) return setError(body.error ?? "Could not create booking");
    router.push(`/booking/${body.booking_reference}`);
  }

  return (
    <form className="booking-grid" onSubmit={submit}>
      <section className="card">
        <h2 className="section-title"><span className="step">1</span> Choose your date</h2>
        <div className="date-strip">
          {dates.slice(0, 7).map(d => <button type="button" key={iso(d)} className={`date-button ${date === iso(d) ? "selected" : ""}`} onClick={() => chooseDate(iso(d))}><span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>{d.getDate()}</strong><span>{d.toLocaleDateString("en-US", { month: "short" })}</span></button>)}
        </div>
        <div className="divider" />
        <h2 className="section-title"><span className="step">2</span> Choose consecutive hours</h2>
        <div className="legend"><span>Available</span><span className="selected-key">Selected</span><span className="booked-key">Unavailable</span></div>
        {!availability && !error ? <div className="loading">Checking availability…</div> : <div className="slots">{availability?.slots.map(slot => <button type="button" key={slot.start} disabled={slot.status !== "available"} onClick={() => toggle(slot)} className={`slot ${selected.includes(slot.start) ? "selected" : slot.status}`}><span>{slot.start}</span><small>{selected.includes(slot.start) ? "Selected" : slot.status}</small></button>)}</div>}
        <div className="divider" />
        <h2 className="section-title"><span className="step">3</span> Your details</h2>
        <div className="form-grid">
          <label className="field">Name<input name="name" required minLength={2} maxLength={80} placeholder="Your name" autoComplete="name" /></label>
          <label className="field">WhatsApp number<input name="phone" required inputMode="tel" placeholder="0812 3456 789" autoComplete="tel" /></label>
        </div>
        <label className="check"><input type="checkbox" required /> <span>I understand that my reservation is held, but not confirmed until approved by the venue.</span></label>
        {error && <div className="notice" role="alert">{error}</div>}
      </section>
      <aside className="card summary">
        <h2>Booking summary</h2><p className="summary-date">{friendlyDate}</p>
        <div className="summary-time">{start && end ? `${start} — ${end}` : "Select your time"}</div>
        <div className="summary-list">
          <div className="summary-line"><span>Duration</span><strong>{chosen.length || "—"} {chosen.length === 1 ? "hour" : "hours"}</strong></div>
          <div className="summary-line"><span>Hourly rate</span><strong>{availability ? money.format(availability.hourly_rate) : "—"}</strong></div>
          <div className="summary-line summary-total"><span>Total</span><strong>{money.format(total)}</strong></div>
        </div>
        <button className="button" disabled={!chosen.length || sending}>{sending ? "Requesting…" : "Request booking"}</button>
      </aside>
    </form>
  );
}
