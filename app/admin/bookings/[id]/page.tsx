import { redirect, notFound } from "next/navigation";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
import { rupiah, shortTime } from "@/lib/booking";
import BookingActions from "./actions";

export default async function AdminBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!await adminUser()) redirect("/admin/login");
  const { id } = await params; const db = serviceClient();
  const { data: b } = await db.from("bookings").select("*,customers(name,phone),payments(*)").eq("id", id).maybeSingle();
  if (!b) notFound(); const customer = b.customers as unknown as { name: string; phone: string }; const payment = b.payments as unknown as { receipt_url?: string; rejection_reason?: string } | null; let receiptUrl: string | undefined;
  if (payment?.receipt_url) receiptUrl = (await db.storage.from("payment-proofs").createSignedUrl(payment.receipt_url, 3600)).data?.signedUrl;
  const wa = `https://wa.me/${customer.phone}?text=${encodeURIComponent(`Hello ${customer.name}, this is regarding your Mahjong booking ${b.booking_reference}.`)}`;
  const confirmationWa = `https://wa.me/${customer.phone}?text=${encodeURIComponent(`Hello ${customer.name}, your Mahjong booking ${b.booking_reference} for ${b.booking_date}, ${shortTime(b.start_time)}–${shortTime(b.end_time)} is confirmed. See you soon!`)}`;
  return <><div className="page-heading"><div className="eyebrow">Booking detail</div><h1>{b.booking_reference}</h1><p><span className={`badge ${b.status}`}>{b.status.replaceAll("_", " ")}</span></p></div><div className="booking-grid"><section className="card"><div className="details"><div className="detail"><small>Customer</small><strong>{customer.name}</strong></div><div className="detail"><small>WhatsApp</small><strong>{customer.phone}</strong></div><div className="detail"><small>Date</small><strong>{b.booking_date}</strong></div><div className="detail"><small>Time</small><strong>{shortTime(b.start_time)} — {shortTime(b.end_time)}</strong></div><div className="detail"><small>Duration</small><strong>{b.duration_minutes / 60} hours</strong></div><div className="detail"><small>Total</small><strong>{rupiah(b.total_amount)}</strong></div></div>{receiptUrl && <p><a className="button secondary" href={receiptUrl} target="_blank" rel="noreferrer">View payment receipt</a></p>}<a className="button secondary" href={wa} target="_blank" rel="noreferrer">Open WhatsApp</a></section><aside className="card"><h2 style={{ marginBottom: 18 }}>Actions</h2><BookingActions id={b.id} status={b.status} confirmationWhatsAppUrl={confirmationWa} /></aside></div></>;
}
