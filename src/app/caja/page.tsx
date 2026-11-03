"use client";

import { useEffect, useState } from "react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

type EntryProduct = { id: string; name: string; priceCents: number };
type Ticket = { id: string; fullName: string; partySize: number; productName: string; totalCents: number };

export default function CashierPage() {
  const [products, setProducts] = useState<EntryProduct[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
    fetch("/api/catalog?type=ENTRY")
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar el catálogo.");
        setProducts(await response.json());
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Error al cargar catálogo."));
  }, []);

  async function sell(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setTicket(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/caja/venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar la venta.");
      setTicket(result.ticket);
    } catch (saleError) {
      setError(saleError instanceof Error ? saleError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUIFEST / VENTA PRESENCIAL</p>
        <h1 className="mt-2 text-3xl font-black">Caja rápida</h1>
        <p className="mt-2 text-sm text-muted">Cobrá la entrada y generá un código QR para el control de acceso.</p>
      </header>
      <form onSubmit={sell} className="grid gap-4 rounded-2xl bg-white p-4 shadow-card sm:grid-cols-2 sm:p-6">
        <Input label="Nombre completo" name="fullName" required minLength={3} />
        <Input label="DNI" name="dni" inputMode="numeric" required minLength={6} />
        <Input label="Email" name="email" type="email" required />
        <Input label="Teléfono" name="phone" type="tel" required minLength={8} />
        <Input label="Fecha de nacimiento (mayores de 18)" name="birthDate" type="date" required />
        <input type="hidden" name="partySize" value="1" />
        <label className="space-y-2 text-sm font-medium">
          <span>Entrada</span>
          <select name="entryProductId" required defaultValue="" className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4">
            <option value="" disabled>Elegí una entrada</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.priceCents)}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Medio de pago</span>
          <select name="paymentMethod" required defaultValue="CASH" className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4">
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia verificada en caja</option>
          </select>
        </label>
        <Button type="submit" className="w-full sm:col-span-2" disabled={busy || products.length === 0}>{busy ? "Registrando..." : "Cobrar y emitir QR"}</Button>
      </form>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {ticket && (
        <section className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-card">
          <h2 className="text-xl font-bold">Entrada emitida</h2>
          <p>{ticket.fullName} · {ticket.partySize} persona(s)</p>
          <p className="text-sm text-muted">{ticket.productName} · {formatMoney(ticket.totalCents)}</p>
          <div className="rounded-xl bg-paper p-4"><ClientQRCode value={siteOrigin ? `${siteOrigin}/ingresar?reserva=${encodeURIComponent(ticket.id)}` : ticket.id} size={192} level="M" /></div>
          <p className="max-w-md break-all font-mono text-xs text-muted">{ticket.id}</p>
          <p className="text-sm text-muted">El QR autoriza el ingreso una sola vez. No es un comprobante fiscal.</p>
          <Button type="button" variant="secondary" onClick={() => window.print()}>Imprimir ticket</Button>
        </section>
      )}
    </div>
  );
}
