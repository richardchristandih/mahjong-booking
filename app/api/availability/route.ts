import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_STATUSES, isPastSlot, minutes } from "@/lib/booking";
import { serviceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "Choose a valid date" }, { status: 400 });

  const db = serviceClient();
  await db.rpc("expire_overdue_bookings");
  const [{ data: settings, error }, { data: table }] = await Promise.all([
    db.from("settings").select("opening_time,closing_time,booking_interval_minutes,hourly_rate,timezone").eq("id", 1).single(),
    db.from("tables").select("id").eq("is_active", true).order("id").limit(1).single(),
  ]);
  if (error || !settings || !table) return NextResponse.json({ error: "Booking settings are unavailable" }, { status: 503 });
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone }).format(now);
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  if (date < today)
    return NextResponse.json({ error: "Choose a future date" }, { status: 400 });

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    db.from("bookings").select("start_time,end_time,status").eq("table_id", table.id).eq("booking_date", date).in("status", [...ACTIVE_STATUSES]),
    db.from("blocked_times").select("start_time,end_time").eq("table_id", table.id).eq("date", date),
  ]);
  const open = minutes(settings.opening_time), close = minutes(settings.closing_time), step = settings.booking_interval_minutes;
  const pad = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  const slots = [];
  for (let start = open; start < close; start += step) {
    const end = start + step;
    const booking = bookings?.find(b => start < minutes(b.end_time) && end > minutes(b.start_time));
    const blocked = blocks?.some(b => start < minutes(b.end_time) && end > minutes(b.start_time));
    const startTime = pad(start);
    const status = blocked ? "blocked" : booking ? (booking.status === "CONFIRMED" ? "booked" : "pending") : isPastSlot(date, today, startTime, currentTime) ? "past" : "available";
    slots.push({ start: startTime, end: pad(end), status });
  }
  return NextResponse.json({ date, opening_time: settings.opening_time.slice(0, 5), closing_time: settings.closing_time.slice(0, 5), hourly_rate: settings.hourly_rate, slots });
}
