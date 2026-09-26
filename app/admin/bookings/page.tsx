import { redirect } from "next/navigation";
import Link from "next/link";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
import { rupiah, shortTime } from "@/lib/booking";

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!await adminUser()) redirect("/admin/login");
  const filters = await searchParams; const db = serviceClient();
  let query = db.from("bookings").select("id,booking_reference,booking_date,start_time,end_time,duration_minutes,total_amount,status,created_at,customers!inner(name,phone)").order("created_at", { ascending: false }).limit(100);
  if (filters.date) query = query.eq("booking_date", filters.date);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("booking_reference", `%${filters.q}%`);
  if (filters.customer) query = query.ilike("customers.name", `%${filters.customer}%`);
  const { data: bookings } = await query;
  return <><div className="page-heading"><div className="eyebrow">All reservations</div><h1>Bookings</h1></div><section className="card"><form className="filters"><input name="date" type="date" defaultValue={filters.date}/><select name="status" defaultValue={filters.status}><option value="">All statuses</option>{["PENDING_APPROVAL","AWAITING_PAYMENT","PAYMENT_REVIEW","CONFIRMED","REJECTED","CANCELLED","EXPIRED"].map(s => <option key={s}>{s}</option>)}</select><input name="customer" placeholder="Customer" defaultValue={filters.customer}/><input name="q" placeholder="Booking ID" defaultValue={filters.q}/><button className="button">Filter</button></form><div className="table-wrap"><table><thead><tr><th>Booking</th><th>Customer</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr></thead><tbody>{bookings?.map(b => { const customer = b.customers as unknown as { name: string; phone: string }; return <tr key={b.id}><td><Link href={`/admin/bookings/${b.id}`}><strong>{b.booking_reference}</strong></Link></td><td>{customer.name}<br/><small>{customer.phone}</small></td><td>{b.booking_date}</td><td>{shortTime(b.start_time)}–{shortTime(b.end_time)}</td><td>{rupiah(b.total_amount)}</td><td><span className={`badge ${b.status}`}>{b.status.replaceAll("_", " ")}</span></td></tr>; })}</tbody></table></div></section></>;
}
