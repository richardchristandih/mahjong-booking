import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Mahjong Room",
  description: "Reserve your mahjong table in under a minute.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="The Mahjong Room home">
            <span className="brand-mark" aria-hidden="true">發</span>
            <span><b>The Mahjong</b><small>ROOM</small></span>
          </Link>
          <Link href="/book" className="header-cta">Book a table</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
