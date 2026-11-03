"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/utils";

type DrinkProduct = { id: string; name: string; priceCents: number; description: string | null };

export function DrinkPurchaseForm({
  reservationId,
  products,
  alias
}: {
  reservationId: string;
  products: DrinkProduct[];
  alias: string;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);
  const total = (selectedProduct?.priceCents ?? 0) * Number(quantity);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/reserva/${reservationId}/pedido`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, paymentReference: reference })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo enviar el pedido.");
      setMessage("Pedido y referencia enviados. La barra lo recibirá cuando el equipo confirme el pago.");
      setReference("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  if (!products.length) return <p className="mt-3 text-sm text-muted">Todavía no hay consumiciones activas.</p>;
  return (
    <div className="mt-4 rounded-2xl bg-paper p-4 sm:p-5">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="block min-w-0 space-y-2 text-sm font-medium text-ink">
          <span>Elegí tu trago</span>
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4">
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.priceCents)}</option>
            ))}
          </select>
        </label>
        <Input label="Cantidad" name="quantity" type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        {alias ? (
          <p className="break-all rounded-xl bg-white p-3 text-sm sm:col-span-2">Total: <strong>{formatMoney(total)}</strong> · Alias: <strong>{alias}</strong></p>
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">Falta configurar PAYMENT_ALIAS. No realices transferencias todavía.</p>
        )}
        {total <= 0 && <p className="text-sm text-amber-900 sm:col-span-2">El precio demo debe configurarse antes de habilitar compras.</p>}
        <div className="sm:col-span-2">
          <Input label="Referencia de transferencia" name="paymentReference" value={reference} onChange={(event) => setReference(event.target.value)} minLength={4} maxLength={100} required disabled={!alias || total <= 0} />
        </div>
        <Button type="submit" className="w-full sm:col-span-2" disabled={!alias || total <= 0 || busy}>
          {busy ? "Enviando..." : "Enviar pedido para verificación"}
        </Button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
      <p className="mt-3 text-xs leading-5 text-muted">La barra recibirá el pedido solo después de que el equipo verifique el pago.</p>
    </div>
  );
}
