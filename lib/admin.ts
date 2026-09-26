import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase";

export async function adminUser() {
  const jar = await cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll: () => {} } },
  );
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const { data: admin } = await serviceClient().from("admins").select("id").eq("id", data.user.id).maybeSingle();
  return admin ? data.user : null;
}
