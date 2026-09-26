import { NextRequest, NextResponse } from "next/server";
import { adminUser } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const user = await adminUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.table_id || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !body.start_time || !body.end_time || !String(body.reason).trim()) return NextResponse.json({ error: "Complete all block details" }, { status: 400 });
  const { error } = await serviceClient().rpc("create_blocked_time", { p_table_id: body.table_id, p_date: body.date, p_start: body.start_time, p_end: body.end_time, p_reason: String(body.reason).trim().slice(0,200), p_admin: user.id });
  return error ? NextResponse.json({ error: "That time is already occupied" }, { status: 409 }) : NextResponse.json({ ok: true });
}
