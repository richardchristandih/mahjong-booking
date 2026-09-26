import { NextRequest, NextResponse } from "next/server";
import { bookingReference, isPastSlot, normalizePhone, validateRange } from "@/lib/booking";
import { notifyBookingCreated } from "@/lib/notifications";
import { serviceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const date = String(body.date ?? ""), start = String(body.start_time ?? ""), end = String(body.end_time ?? "");
  if (name.length < 2 || name.length > 80 || !/^62\d{8,13}$/.test(phone) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "Enter a valid name and Indonesian WhatsApp number" }, { status: 400 });

  const db = serviceClient();
  const { data: settings } = await db.from("settings").select("opening_time,closing_time,booking_interval_minutes,timezone").eq("id", 1).single();
  if (!settings) return NextResponse.json({ error: "Booking settings are unavailable" }, { status: 503 });
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone }).format(now);
  const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  if (date < today || !validateRange(start, end, settings.opening_time, settings.closing_time, settings.booking_interval_minutes))
    return NextResponse.json({ error: "Choose a valid available time" }, { status: 400 });
  if (isPastSlot(date, today, start, currentTime))
    return NextResponse.json({ error: "That start time has already passed. Please choose a later time." }, { status: 400 });

  const reference = bookingReference(date);
  const { error } = await db.rpc("create_booking", { p_reference: reference, p_name: name, p_phone: phone, p_date: date, p_start: start, p_end: end });
  if (error) {
    const conflict = error.code === "23P01" || /unavailable|overlap/i.test(error.message);
    const past = /past time/i.test(error.message);
    return NextResponse.json({ error: conflict ? "That time was just taken. Please choose another." : past ? "That start time has already passed. Please choose a later time." : "Could not create your booking" }, { status: conflict ? 409 : 400 });
  }
  const { data: booking } = await db.from("bookings").select("id,booking_reference,booking_date,start_time,end_time,duration_minutes,total_amount,customers(name,phone)").eq("booking_reference", reference).maybeSingle();
  if (booking) {
    try {
      await notifyBookingCreated(booking, request);
    } catch (error) {
      console.error(error);
    }
  }
  return NextResponse.json({ booking_reference: reference }, { status: 201 });
}
