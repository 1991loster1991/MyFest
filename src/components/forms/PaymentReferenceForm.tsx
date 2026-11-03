"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";

/** Botón celeste de Mercado Pago (link configurable por alias/env). */
function mercadoPagoUrl(
  amountCents: number,
  alias: string,
  reservationId: string,
) {
  const base = process.env.NEXT_PUBLIC_MERCADO_PAGO_LINK?.trim();
  if (base) return base.replace("{reserva}", encodeURIComponent(reservationId));
  const amount = (amountCents / 100).toFixed(2);
  if (alias)
    return `https://link.mercadopago.com.ar/${encodeURIComponent(alias)}?amount=${amount}`;
  return `https://www.mercadopago.com.ar/`;
}

export function PaymentReferenceForm({
  endpoint,
  alias,
  amount,
  reservationId,
}: {
  endpoint: string;
  alias: string;
  amount: number;
  reservationId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mpAlias = process.env.NEXT_PUBLIC_MERCADO_PAGO_ALIAS || alias;
  const mpLink = mercadoPagoUrl(amount, mpAlias, reservationId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Adjuntá una foto o PDF del comprobante.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("receipt", file);
      if (reference.trim()) body.set("paymentReference", reference.trim());
      const response = await fetch(endpoint, { method: "POST", body });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "No se pudo enviar el comprobante.");
      setMessage(result.message ?? "Comprobante enviado.");
      setFileName("");
      setReference("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ocurrió un error.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <p className="rounded-xl bg-white p-3 text-sm">
        Total a abonar: <strong>{formatMoney(amount)}</strong>
        {alias && (
          <>
            {" "}
            · Alias <strong>{alias}</strong>
          </>
        )}
      </p>

      <a
        href={amount > 0 ? mpLink : undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={amount <= 0}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#009ee3] px-5 text-base font-bold text-white transition hover:bg-[#008fcc] ${amount <= 0 ? "pointer-events-none opacity-50" : ""}`}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-black text-[#009ee3]">
          MP
        </span>
        Pagar con Mercado Pago
      </a>

      {amount <= 0 && (
        <p className="text-sm text-amber-900">
          El precio todavía no está configurado. Consultá con el equipo del
          evento.
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm font-semibold">
          ¿Ya pagaste? Adjuntá y enviá el comprobante
        </p>
        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>Comprobante (imagen o PDF, hasta 4 MB)</span>
          <input
            ref={inputRef}
            type="file"
            name="receipt"
            accept="image/*,application/pdf"
            required
            disabled={busy || amount <= 0}
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? "")
            }
            className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
          />
          {fileName && (
            <span className="block text-xs text-muted">
              Seleccionado: {fileName}
            </span>
          )}
        </label>
        <label className="block space-y-2 text-sm font-medium text-ink">
          <span>Referencia u operación (opcional)</span>
          <input
            name="paymentReference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={100}
            disabled={busy}
            placeholder="Número de operación o alias de quien transfirió"
            className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-base outline-none focus:border-ink"
          />
        </label>
        <button
          type="submit"
          disabled={busy || amount <= 0}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-base font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Enviando…" : "Adjuntar y enviar comprobante"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-3 text-sm text-green-900"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <p className="text-xs leading-5 text-muted">
        El comprobante queda registrado en el panel del evento y se envía al
        equipo para su verificación.
      </p>
    </div>
  );
}
