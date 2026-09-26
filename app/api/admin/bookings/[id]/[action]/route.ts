import { NextRequest, NextResponse } from "next/server";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";

const transitions: Record<string, { from: string; to: string }> = {
  approve: { from: "PENDING_APPROVAL", to: "AWAITING_PAYMENT" },
  reject: { from: "PENDING_APPROVAL", to: "REJECTED" },
  "confirm-payment": { from: "PAYMENT_REVIEW", to: "CONFIRMED" },
  "reject-payment": { from: "PAYMENT_REVIEW", to: "AWAITING_PAYMENT" },
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const user = await adminUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await params; const body = await request.json().catch(() => ({})); const db = serviceClient();
  const { data: booking } = await db.from("bookings").select("id,status,total_amount").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  let patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "cancel") {
    if (["REJECTED","CANCELLED","EXPIRED"].includes(booking.status)) return NextResponse.json({ error: "Booking cannot be cancelled" }, { status: 409 });
    patch.status = "CANCELLED";
  } else {
    const transition = transitions[action];
    if (!transition || booking.status !== transition.from) return NextResponse.json({ error: "Action is not valid for this status" }, { status: 409 });
    patch.status = transition.to;
    if (action === "approve" || action === "reject-payment") {
      const { data: settings } = await db.from("settings").select("payment_deadline_minutes").eq("id", 1).single();
      patch.payment_due_at = new Date(Date.now() + (settings?.payment_deadline_minutes ?? 3) * 60000).toISOString();
    }
    if (action === "approve") {
      await db.from("payments").upsert({ booking_id: booking.id, amount: booking.total_amount, status: "PENDING" }, { onConflict: "booking_id" });
    }
    if (action === "reject") patch.admin_note = String(body.reason ?? "").slice(0, 500) || null;
    if (action === "confirm-payment") await db.from("payments").update({ status: "CONFIRMED", verified_at: new Date().toISOString(), verified_by: user.id }).eq("booking_id", booking.id);
    if (action === "reject-payment") {
      const reason = String(body.reason ?? "").trim(); if (!reason) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
      await db.from("payments").update({ status: "REJECTED", rejection_reason: reason.slice(0, 500), verified_at: new Date().toISOString(), verified_by: user.id }).eq("booking_id", booking.id);
    }
  }
  const { error } = await db.from("bookings").update(patch).eq("id", booking.id).eq("status", booking.status);
  return error ? NextResponse.json({ error: "Could not update booking" }, { status: 500 }) : NextResponse.json({ ok: true });
}
