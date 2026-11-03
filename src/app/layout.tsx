import type { Metadata } from "next";
import Link from "next/link";
import { TreePalm } from "lucide-react";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "MauiFest — Elegant Nights",
  description: "Pre-reservas, acceso y operación de eventos en un solo lugar.",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MauiFest", statusBarStyle: "black-translucent" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerRegistration />
        <header className="border-b border-gold/40 bg-ink text-white shadow-[0_8px_24px_rgba(7,27,53,0.12)]">
          <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
            <Link href="/pre-ingreso" aria-label="Maui Fest, ir al lobby" className="flex min-w-0 shrink-0 items-center gap-3">
              <TreePalm aria-hidden="true" className="h-10 w-10 shrink-0 text-gold" strokeWidth={1.7} />
              <span className="min-w-0">
                <span className="flex items-baseline gap-1 font-serif leading-tight tracking-wide">
                  <span className="text-xl font-bold text-white sm:text-2xl">MAUI</span>
                  <span className="text-sm font-semibold text-gold sm:text-base">Fest</span>
                </span>
                <span className="mt-0.5 block text-[8px] font-medium uppercase leading-tight tracking-[0.16em] text-white/60 sm:text-[10px] sm:tracking-[0.2em]">Elegant Nights</span>
              </span>
            </Link>
            <nav aria-label="Navegación principal" className="flex shrink-0 items-center gap-0.5 text-xs font-medium sm:gap-2 sm:text-sm">
              <Link href="/" aria-label="Volver al home" className="rounded-full border border-gold/70 px-2.5 py-2 text-gold transition-colors hover:bg-gold hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-3">Home</Link>
              <Link href="/pre-reserva" className="rounded-full px-2 py-2 text-white/85 transition-colors hover:bg-white/10 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-3">Pre-reserva</Link>
              <Link href="/admin" className="rounded-full px-2 py-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-3">Equipo</Link>
            </nav>
          </div>
          <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
        </header>
        <main>{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted sm:px-5 sm:py-10">MauiFest · Elegant Nights</footer>
      </body>
    </html>
  );
}
