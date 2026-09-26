import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const db = serviceClient();
  await db.rpc("expire_overdue_bookings");
  const { data, error } = await db.from("bookings").select("booking_reference,booking_date,start_time,end_time,duration_minutes,hourly_rate,total_amount,status,payment_due_at,customers(name),payments(rejection_reason)").eq("booking_reference", reference).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const { data: settings } = await db.from("settings").select("venue_name,qris_image_url,qris_account_name,payment_instructions,whatsapp_number").eq("id", 1).single();
  const customer = data.customers as unknown as { name: string };
  const payment = data.payments as unknown as { rejection_reason: string | null } | null;
  return NextResponse.json({
    booking_reference: data.booking_reference,
    customer_name: customer.name,
    booking_date: data.booking_date,
    start_time: data.start_time.slice(0, 5), end_time: data.end_time.slice(0, 5),
    duration_minutes: data.duration_minutes, hourly_rate: data.hourly_rate, total_amount: data.total_amount,
    status: data.status, payment_due_at: data.payment_due_at, payment_rejection_reason: payment?.rejection_reason,
    settings: { ...settings, qris_image_url: settings?.qris_image_url || "/qris.jpeg" },
  });
}
