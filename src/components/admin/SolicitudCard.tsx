"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { ReservationSummary } from "@/types";
import { AttendeeIdentityList } from "@/components/ui/AttendeeIdentityList";

type Attendee = { role: string; fullName: string; dni: string; birthDate: string | null; checkedInAt: string | null; wristbandCode: string | null };

export function SolicitudCard({ reservation, paymentAlias, attendees }: { reservation: ReservationSummary; paymentAlias: string; attendees: Attendee[] }) {
  const [status, setStatus] = useState(reservation.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function paymentUrl() {
    return `${window.location.origin}/reserva/${encodeURIComponent(reservation.id)}`;
  }

  function openWhatsApp() {
    const phone = reservation.phone.replace(/\D/g, "");
    if (!phone) {
      setError("La solicitud no tiene un teléfono válido para abrir WhatsApp.");
      return;
    }
    const message = `¡Hola ${reservation.fullName}! Tu pre-reserva de Maui Fest fue aprobada. Para completar la reserva, ingresá a ${paymentUrl()}${paymentAlias ? ` y transferí al alias ${paymentAlias}` : ""}. Luego cargá la referencia del pago en esa misma página. El equipo verificará el pago para confirmar tu ingreso.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function copyPaymentLink() {
    try {
      await navigator.clipboard.writeText(paymentUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace. Copialo desde la barra del navegador.");
    }
  }

  async function evaluate(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/evaluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id, decision })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar.");
      setStatus(result.reservation.status);
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="min-w-0 rounded-2xl border border-black/5 bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold">{reservation.fullName}</h2>
          <p className="mt-1 break-all text-sm text-muted">{reservation.email ? `${reservation.email} · ` : ""}{reservation.phone}</p>
        </div>
        <Badge status={status} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="min-w-0"><dt className="text-muted">DNI</dt><dd className="break-all font-semibold">{reservation.dni}</dd></div>
        <div><dt className="text-muted">Personas</dt><dd className="font-semibold">{reservation.partySize}</dd></div>
        <div className="min-w-0"><dt className="text-muted">Solicitud</dt><dd className="break-words font-semibold">{formatDate(reservation.createdAt)}</dd></div>
        <div><dt className="text-muted">Código</dt><dd className="break-all font-mono text-xs">{reservation.id}</dd></div>
      </dl>
      <AttendeeIdentityList attendees={attendees} partySize={reservation.partySize} />
      {reservation.notes && <p className="mt-4 rounded-xl bg-paper p-3 text-sm">{reservation.notes}</p>}
      {status === "PENDING" && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm font-bold text-amber-950">Esta solicitud requiere una decisión</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" className="w-full min-h-12 text-base" disabled={busy} onClick={() => evaluate("APPROVED")}>{busy ? "Procesando…" : "Aprobar solicitud"}</Button>
            <Button type="button" variant="danger" className="w-full min-h-12 text-base" disabled={busy} onClick={() => evaluate("REJECTED")}>{busy ? "Procesando…" : "Rechazar solicitud"}</Button>
          </div>
        </div>
      )}
      {status === "APPROVED" && (
        <div className="mt-5 rounded-xl bg-paper p-4">
          <p className="text-sm font-semibold">Compartí el enlace personal para completar el pago:</p>
          <p className="mt-1 break-all text-sm text-muted">/reserva/{reservation.id}</p>
          {paymentAlias ? <p className="mt-2 text-sm">Alias de pago: <strong>{paymentAlias}</strong></p> : <p className="mt-2 text-sm text-amber-800">Configurá PAYMENT_ALIAS para incluir el alias en las instrucciones.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={openWhatsApp}>Preparar mensaje en WhatsApp</Button>
            <Button type="button" variant="secondary" onClick={copyPaymentLink}>{copied ? "Enlace copiado" : "Copiar enlace"}</Button>
          </div>
          <p className="mt-2 text-xs text-muted">WhatsApp abrirá el mensaje listo; confirmá el envío allí.</p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}
