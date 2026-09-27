import { NextRequest, NextResponse } from "next/server";
import { notifyPaymentSubmitted } from "@/lib/notifications";
import { removePaymentProof } from "@/lib/payment-proofs";
import { serviceClient } from "@/lib/supabase";

const types = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const form = await request.formData();
  const file = form.get("receipt");
  if (!(file instanceof File) || !types.has(file.type) || file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP, or PDF up to 5 MB" }, { status: 400 });
  const db = serviceClient();
  await db.rpc("expire_overdue_bookings");
  const { data: booking } = await db.from("bookings").select("id,status,total_amount,payments(receipt_url)").eq("booking_reference", reference).single();
  if (!booking || booking.status !== "AWAITING_PAYMENT") return NextResponse.json({ error: "This booking is not awaiting payment" }, { status: 409 });
  const payments = booking.payments as unknown as { receipt_url?: string | null } | { receipt_url?: string | null }[] | null;
  const payment = Array.isArray(payments) ? payments[0] : payments;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${booking.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await db.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: "Could not upload receipt" }, { status: 500 });
  const { error } = await db.from("payments").upsert({ booking_id: booking.id, amount: booking.total_amount, receipt_url: path, status: "SUBMITTED", rejection_reason: null, submitted_at: new Date().toISOString() }, { onConflict: "booking_id" });
  if (error) return NextResponse.json({ error: "Could not save receipt" }, { status: 500 });
  const { error: updateError } = await db.from("bookings").update({ status: "PAYMENT_REVIEW", updated_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "AWAITING_PAYMENT");
  if (updateError) return NextResponse.json({ error: "Could not update booking" }, { status: 500 });
  if (payment?.receipt_url && payment.receipt_url !== path) {
    try {
      await removePaymentProof(payment.receipt_url);
    } catch (error) {
      console.error(error);
    }
  }
  const { data: submitted } = await db.from("bookings").select("id,booking_reference,booking_date,start_time,end_time,duration_minutes,total_amount,customers(name,phone)").eq("id", booking.id).maybeSingle();
  if (submitted) {
    try {
      await notifyPaymentSubmitted(submitted, request);
    } catch (error) {
      console.error(error);
    }
  }
  return NextResponse.json({ ok: true });
}
