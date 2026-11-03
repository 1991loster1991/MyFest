"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BarOrderSummary } from "@/types";

export function BarOrderCard({ order, onDelivered }: { order: BarOrderSummary; onDelivered: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function deliver() {
    setBusy(true);
    try {
      const response = await fetch("/api/barra/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo marcar como entregado.");
      onDelivered(order.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex min-w-0 flex-col items-stretch justify-between gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <div className="min-w-0">
        <h2 className="break-words font-bold">{order.itemName} <span className="text-muted">× {order.quantity}</span></h2>
        <p className="mt-1 break-words text-sm text-muted">{order.guestName} · Pulsera vinculada a reserva {order.reservationId.slice(-6)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
        <Badge status={order.status} />
        {order.status === "PENDING" && <Button type="button" disabled={busy} onClick={deliver}>Entregar</Button>}
      </div>
    </article>
  );
}
