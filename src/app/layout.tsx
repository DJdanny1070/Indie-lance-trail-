import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Indian Freelance Platform - AI Driven Marketplace",
  description: "Connect with the best Indian freelancers for your next project.",
};

import NotificationBell from "@/components/NotificationBell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="glass" style={{ position: "sticky", top: 0, zIndex: 50, borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
              IndieLance
            </Link>
            <div className="flex gap-6 items-center lg:mr-4">
              <Link href="/freelancers" className="font-semibold text-muted">Discover Talent</Link>
              <Link href="/jobs" className="font-semibold text-muted">Find Work</Link>
              <Link href="/login" className="btn btn-outline ml-2">Log In</Link>
              <Link href="/register" className="btn btn-primary">Sign Up</Link>
              <NotificationBell />
            </div>
          </div>
        </nav>
        
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
