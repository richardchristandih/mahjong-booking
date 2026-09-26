"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget);
    const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await client.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    setBusy(false); if (error) return setError("Invalid email or password"); router.push("/admin"); router.refresh();
  }
  return <section className="card status-card"><div className="eyebrow">Venue access</div><h1 style={{ fontSize: 42, margin: "8px 0 24px" }}>Admin sign in</h1><form onSubmit={login} style={{ display: "grid", gap: 14 }}><label className="field">Email<input required name="email" type="email" autoComplete="email" /></label><label className="field">Password<input required name="password" type="password" autoComplete="current-password" /></label>{error && <div className="notice">{error}</div>}<button className="button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form></section>;
}
