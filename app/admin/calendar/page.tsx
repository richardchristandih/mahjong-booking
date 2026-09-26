import { redirect } from "next/navigation";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
import CalendarDay from "./calendar-day";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  if (!await adminUser()) redirect("/admin/login"); const date = (await searchParams).date ?? new Date().toLocaleDateString("en-CA"); const db = serviceClient();
  const [{ data: settings }, { data: table }, { data: bookings }, { data: blocks }] = await Promise.all([db.from("settings").select("opening_time,closing_time,booking_interval_minutes").eq("id",1).single(), db.from("tables").select("id").eq("is_active",true).limit(1).single(), db.from("bookings").select("id,start_time,end_time,status,customers(name)").eq("booking_date",date).not("status","in",'(REJECTED,CANCELLED,EXPIRED)'), db.from("blocked_times").select("*").eq("date",date)]);
  return <><div className="page-heading"><div className="eyebrow">Table schedule</div><h1>Calendar</h1></div><CalendarDay date={date} settings={settings!} tableId={table!.id} bookings={bookings ?? []} blocks={blocks ?? []}/></>;
}
