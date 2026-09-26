import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className="admin-shell"><nav className="admin-nav"><Link href="/admin">Overview</Link><Link href="/admin/bookings">Bookings</Link><Link href="/admin/calendar">Calendar</Link><Link href="/admin/settings">Settings</Link></nav>{children}</main>;
}
