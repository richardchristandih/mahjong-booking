import Link from "next/link";
import StatusLookup from "./status-lookup";

export default function Home() {
  return (
    <main className="hero">
      <div className="hero-inner home-hero">
        <section className="hero-copy">
          <div className="eyebrow">Your table awaits</div>
          <h1>Good games.<em>Great company.</em></h1>
          <p>Choose a time, gather your favorite people, and leave the table to us. Your next mahjong session is only a minute away.</p>
          <Link className="button" href="/book">Book a table <span aria-hidden="true">&nbsp;→</span></Link>
        </section>
        <StatusLookup />
        <div className="trust-row"><span>No account needed</span><span>Simple QRIS payment</span><span>Open daily 10–10</span></div>
      </div>
    </main>
  );
}
