"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type RecentBooking = {
  reference: string;
  date: string;
  start: string;
  end: string;
  status: string;
};

const recentBookingKey = "mahjong-recent-booking";

export default function StatusLookup() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [recent] = useState<RecentBooking | undefined>(() => {
    if (typeof window === "undefined") return undefined;

    const saved = window.localStorage.getItem(recentBookingKey);
    if (!saved) return undefined;

    try {
      return JSON.parse(saved) as RecentBooking;
    } catch {
      window.localStorage.removeItem(recentBookingKey);
      return undefined;
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = reference.trim().replace(/\s+/g, "").toUpperCase();

    if (!cleaned) {
      setError("Enter your booking ID to check the latest status.");
      return;
    }

    setError("");
    router.push(`/booking/${encodeURIComponent(cleaned)}`);
  }

  return (
    <form className="status-lookup" onSubmit={submit}>
      <div>
        <div className="eyebrow">Already booked?</div>
        <h2>Check booking status</h2>
        <p>Use your booking ID to see approval, payment, and confirmation updates.</p>
      </div>
      {recent && (
        <Link className="recent-booking" href={`/booking/${encodeURIComponent(recent.reference)}`}>
          <span>Last booking on this device</span>
          <strong>{recent.reference}</strong>
          <small>{recent.date} · {recent.start} — {recent.end} · {recent.status.replaceAll("_", " ")}</small>
        </Link>
      )}
      <label className="field">
        Booking ID
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="MJ-20260928-ABC123"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {error && <div className="notice" role="alert">{error}</div>}
      <button className="button" type="submit">Check status</button>
    </form>
  );
}
