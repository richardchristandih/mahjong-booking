import { redirect } from "next/navigation";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";

export default async function AdminDashboard() {
  if (!await adminUser()) redirect("/admin/login");
  const db = serviceClient(); const today = new Date().toLocaleDateString("en-CA");
  const { data } = await db.from("bookings").select("status").eq("booking_date", today);
  const count = (status: string) => data?.filter(b => b.status === status).length ?? 0;
  return <><div className="page-heading"><div className="eyebrow">Venue control</div><h1>Today at a glance</h1><p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p></div><div className="stat-grid"><div className="card stat"><strong>{count("PENDING_APPROVAL")}</strong><span>Pending approval</span></div><div className="card stat"><strong>{count("AWAITING_PAYMENT")}</strong><span>Waiting for payment</span></div><div className="card stat"><strong>{count("PAYMENT_REVIEW")}</strong><span>Payment review</span></div><div className="card stat"><strong>{count("CONFIRMED")}</strong><span>Confirmed</span></div></div></>;
}
