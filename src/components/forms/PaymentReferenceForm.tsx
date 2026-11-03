"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/utils";

export function PaymentReferenceForm({
  endpoint,
  alias,
  amount
}: {
  endpoint: string;
  alias: string;
  amount: number;
}) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReference: reference })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo enviar el pago.");
      setMessage("Referencia recibida. El pago queda pendiente de verificación manual.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = amount > 0 && Boolean(alias);
  return (
    <div className="mt-4 space-y-4">
      {alias ? (
        <p className="break-all rounded-xl bg-white p-3 text-sm">Transferí <strong>{formatMoney(amount)}</strong> al alias <strong>{alias}</strong>.</p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Falta configurar PAYMENT_ALIAS. No realices transferencias todavía.</p>
      )}
      {amount <= 0 && <p className="text-sm text-amber-900">El precio de demostración está en $0. El administrador debe cargar el precio real antes de habilitar pagos.</p>}
      <form onSubmit={submit} className="space-y-3">
        <Input
          label="Número o referencia de la transferencia"
          name="paymentReference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          required
          minLength={4}
          maxLength={100}
          disabled={!canSubmit || busy}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={!canSubmit || busy}>
          {busy ? "Enviando..." : "Enviar para verificación"}
        </Button>
      </form>
      {message && <p role="status" className="text-sm text-muted">{message}</p>}
      <p className="text-xs leading-5 text-muted">El comprobante no se verifica automáticamente: el equipo confirmará la transferencia en la cuenta antes de validar tu entrada.</p>
    </div>
  );
}
