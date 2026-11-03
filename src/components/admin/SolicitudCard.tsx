"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { ReservationSummary } from "@/types";
import { AttendeeIdentityList } from "@/components/ui/AttendeeIdentityList";
import { ClientQRCode } from "@/components/ui/ClientQRCode";

type Attendee = { role: string; fullName: string; dni: string; birthDate: string | null; checkedInAt: string | null; wristbandCode: string | null; qrCode?: string | null };

function acceptedText(reservation: ReservationSummary, alias: string) {
  const total = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format((reservation.entryPriceCents ?? 0) * reservation.partySize);
  return `¡Hola ${reservation.fullName}! Tu solicitud para Maui Fest ha sido aceptada. Realizá la reserva por ${total} (${reservation.partySize} × ${reservation.entryProductName ?? "entrada"}).${alias ? ` Alias de pago: ${alias}.` : ""} Adjuntá el comprobante por este medio y aguardá la activación.`;
}

export function SolicitudCard({ reservation, paymentAlias, attendees }: { reservation: ReservationSummary; paymentAlias: string; attendees: Attendee[] }) {
  const router = useRouter();
  const [status, setStatus] = useState(reservation.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [qrCodes, setQrCodes] = useState<Array<{ fullName: string; qrCode: string }>>([]);

  function paymentUrl() {
    return `${window.location.origin}/reserva/${encodeURIComponent(reservation.id)}`;
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

  async function toggleActivation(active: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id, active })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar la activación.");
      setStatus(result.reservation.status);
      router.refresh();
      if (active) {
        setQrCodes(result.people ?? []);
        setNotice(result.whatsapp?.sent ? "Reserva activada. Se enviaron el mensaje y los QR por WhatsApp, y quedaron en la campanita del cliente." : `Reserva activada. La notificación quedó en la campanita del cliente. ${result.whatsapp?.error ?? ""}`);
      } else {
        setNotice("Reserva desactivada. El cliente ya no puede presentarse con el QR hasta volver a activarla.");
      }
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
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
      router.refresh();
      if (result.message) {
        setNotice(result.whatsapp?.sent ? "Solicitud aprobada y mensaje enviado por WhatsApp; también quedó en la campanita del cliente." : `Solicitud aprobada. La notificación quedó en la campanita del cliente. ${result.whatsapp?.error ?? ""}`);
      }
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
        <Badge status={status} label={status === "APPROVED" ? (reservation.paymentStatus === "PAID" ? "Pendiente en puerta" : "Pendiente de pago") : status === "ACTIVATED" ? "Aprobada" : undefined} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="min-w-0"><dt className="text-muted">DNI</dt><dd className="break-all font-semibold">{reservation.dni}</dd></div>
        <div><dt className="text-muted">Personas</dt><dd className="font-semibold">{reservation.partySize}</dd></div>
        <div className="min-w-0"><dt className="text-muted">Solicitud</dt><dd className="break-words font-semibold">{formatDate(reservation.createdAt)}</dd></div>
        <div><dt className="text-muted">Código</dt><dd className="break-all font-mono text-xs">{reservation.id}</dd></div>
      </dl>
      <AttendeeIdentityList attendees={attendees} partySize={reservation.partySize} reservationStatus={status} showStatus={false} />
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
            <Button type="button" onClick={() => window.open(`https://wa.me/${reservation.phone.replace(/\D/g, "")}?text=${encodeURIComponent(acceptedText(reservation, paymentAlias))}`, "_blank", "noopener,noreferrer")}>Enviar aviso de pago por WhatsApp</Button>
            <Button type="button" variant="secondary" onClick={copyPaymentLink}>{copied ? "Enlace copiado" : "Copiar enlace"}</Button>
          </div>
          <p className="mt-2 text-xs text-muted">Usá este botón si el envío automático falló: abre el mensaje con el total a pagar y el alias. El cliente adjunta el comprobante por ese mismo medio.</p>
        </div>
      )}
      {(status === "APPROVED" || status === "ACTIVATED" || status === "CHECKED_IN") && (
        <div className={status === "ACTIVATED" ? "mt-5 rounded-xl border border-green-200 bg-green-50 p-4" : "mt-5 rounded-xl border border-black/10 bg-paper p-4"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{status === "ACTIVATED" ? "Reserva activada" : "Activación de la reserva"}</p>
              <p className="mt-1 text-xs text-muted">{qrCodes.length ? "QR únicos emitidos para este evento" : "El QR único por persona se genera al confirmar el pago y se envía al activar."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy || status === "ACTIVATED"} onClick={() => toggleActivation(true)}>{busy ? "Procesando…" : "Activar"}</Button>
              <Button type="button" variant="danger" disabled={busy || status !== "ACTIVATED"} onClick={() => toggleActivation(false)}>{busy ? "Procesando…" : "Desactivar"}</Button>
            </div>
          </div>
          {status === "APPROVED" && <p className="mt-2 rounded-lg bg-white p-2 text-xs text-amber-900">Para activar, primero confirmá el comprobante en <strong>Pagos</strong>. El sistema emite un QR único por persona que nunca se repite.</p>}
          {qrCodes.length > 0 && (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {qrCodes.map((person) => (
                <li key={person.qrCode} className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 text-center">
                  <ClientQRCode value={person.qrCode} size={112} level="H" />
                  <p className="text-sm font-semibold">{person.fullName}</p>
                  <p className="break-all font-mono text-[11px] text-muted">{person.qrCode}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && <p role="status" className="mt-3 break-words rounded-xl bg-white p-3 text-sm">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}
