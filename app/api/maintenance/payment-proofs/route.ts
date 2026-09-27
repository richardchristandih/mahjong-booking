import { NextRequest, NextResponse } from "next/server";
import { cleanupOldPaymentProofs } from "@/lib/payment-proofs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await cleanupOldPaymentProofs();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not clean up payment proofs" }, { status: 500 });
  }
}

export const POST = GET;
