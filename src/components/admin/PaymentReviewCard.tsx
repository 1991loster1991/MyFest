"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

type PaymentRecord = {
  id: string;
  kind: "ENTRY" | "DRINK";
  buyerName: string;
  buyerEmail: string;
  description: string;
  quantity: number;
  totalCents: number;
  reference: string;
  reservationId: string;
  receipt?: { url: string; name: string; createdAt: string; emailSent: boolean; emailError: string | null } | null;
};

export function PaymentReviewCard({ payment }: { payment: PaymentRecord }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(decision: "PAID" | "REJECTED") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(payment.kind === "ENTRY" ? { reservationId: payment.id } : { orderId: payment.id }),
          decision
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo revisar el pago.");
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words font-bold">{payment.buyerName} · {payment.description}</h2>
          <p className="mt-1 break-all text-sm text-muted">{payment.buyerEmail}</p>
        </div>
        <strong>{formatMoney(payment.totalCents)}</strong>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Referencia</dt><dd className="break-all font-mono">{payment.reference}</dd></div>
        <div><dt className="text-muted">Reserva</dt><dd className="break-all font-mono">{payment.reservationId}</dd></div>
      </dl>
      {payment.receipt && (
        <div className="mt-4 rounded-xl bg-paper p-3">
          <p className="text-sm font-semibold">Comprobante adjunto</p>
          {payment.receipt.url.startsWith("data:image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={payment.receipt.url} alt={`Comprobante de ${payment.buyerName}`} className="mt-2 max-h-80 w-auto rounded-lg border border-black/10" />
          ) : (
            <a href={payment.receipt.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-sm font-semibold underline">Abrir {payment.receipt.name}</a>
          )}
          <p className="mt-2 text-xs text-muted">{payment.receipt.emailSent ? "Enviado por correo al equipo" : `Correo no enviado${payment.receipt.emailError ? `: ${payment.receipt.emailError}` : ""}`}</p>
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2 min-[380px]:flex-row">
        <Button type="button" className="w-full min-[380px]:w-auto" disabled={busy} onClick={() => review("PAID")}>Confirmar pago</Button>
        <Button type="button" variant="danger" className="w-full min-[380px]:w-auto" disabled={busy} onClick={() => review("REJECTED")}>Rechazar</Button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}
