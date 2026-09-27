import { serviceClient } from "@/lib/supabase";

const PAYMENT_PROOF_RETENTION_DAYS = 7;
const proofBucket = "payment-proofs";

type PaymentProofRow = {
  id: number;
  receipt_url: string | null;
};

export async function removePaymentProof(path?: string | null) {
  if (!path) return;

  const db = serviceClient();
  const { error } = await db.storage.from(proofBucket).remove([path]);
  if (error) throw error;
}

export async function cleanupOldPaymentProofs() {
  const db = serviceClient();
  const cutoff = new Date(Date.now() - PAYMENT_PROOF_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("payments")
    .select("id,receipt_url")
    .not("receipt_url", "is", null)
    .not("verified_at", "is", null)
    .lt("verified_at", cutoff)
    .in("status", ["CONFIRMED", "REJECTED"]);

  if (error) throw error;

  const rows = (data ?? []) as PaymentProofRow[];
  const paths = rows.map((row) => row.receipt_url).filter((path): path is string => Boolean(path));
  if (!paths.length) return { deleted: 0 };

  const { error: removeError } = await db.storage.from(proofBucket).remove(paths);
  if (removeError) throw removeError;

  const { error: updateError } = await db.from("payments").update({ receipt_url: null }).in("id", rows.map((row) => row.id));
  if (updateError) throw updateError;

  return { deleted: paths.length };
}
