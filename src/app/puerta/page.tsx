"use client";

import { useCallback, useState } from "react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { DoorScanner } from "@/components/scanners/DoorScanner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Load = {
  id: string;
  personName: string;
  dni: string;
  qrCode: string;
  productName: string;
  eventDate: string | null;
  eventPlace: string | null;
  consumptionItem: string | null;
  accessStatus: string;
  rejectionReason: string | null;
  admittedAt: string | null;
  deliveredAt: string | null;
};

type ScanResult = {
  load: Load;
  reservation: {
    id: string;
    fullName: string;
    partySize: number;
    status: string;
    paymentStatus: string;
    entryProductName: string;
    checkedInAt: string | null;
  };
  isPrimary: boolean;
  matchesCurrentEvent: boolean;
  pendingEvent: boolean;
  consumptionAvailable: boolean;
  reasonLabels: Record<string, string>;
};

type Decision = {
  decision: string;
  message: string;
  wristbandCode?: string;
} | null;

const ACCESS_LABELS: Record<string, string> = {
  PENDING: "QR sin activar",
  ADMITTED: "Ingreso activado",
  REJECTED: "Ingreso rechazado",
  DELIVERED: "Consumición retirada",
};

function dateLabel(value: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function timeLabel(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default function DoorPage() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [reason, setReason] = useState("");

  const lookup = useCallback(async (value: string) => {
    setBusy(true);
    setError("");
    setDecision(null);
    setRejecting(false);
    setReason("");
    setReasonCode("");
    try {
      const response = await fetch("/api/puerta/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: value }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "No se pudo validar el QR.");
      setScan(result);
    } catch (lookupError) {
      setScan(null);
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "No se pudo validar el QR.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  async function sendDecision(next: "ACTIVATE" | "REJECT") {
    if (!scan) return;
    setBusy(true);
    setError("");
    setDecision(null);
    try {
      const response = await fetch("/api/puerta/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: scan.load.qrCode,
          decision: next,
          ...(next === "REJECT"
            ? { reason, reasonCode: reasonCode || undefined }
            : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "No se pudo registrar la decisión.");
      setDecision(result);
      setRejecting(false);
      setScan(null);
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Ocurrió un error.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-5">
      <div>
        <h2 className="text-2xl font-black">Control de acceso</h2>
        <p className="mt-1 text-sm text-muted">
          Escaneá el QR del cliente. Verificá sus datos y el DNI, y elegí
          Activar o Rechazar. Al activar, queda habilitada su consumición para
          retirar en barra.
        </p>
      </div>

      <DoorScanner onScan={(value) => void lookup(value)} />

      <div className="rounded-2xl bg-white p-4">
        <p className="mb-3 text-sm font-semibold">
          O ingresá manualmente el código QR o el DNI
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const code = String(data.get("code") ?? "").trim();
            if (code) void lookup(code);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            name="code"
            aria-label="Código QR o DNI"
            placeholder="MFQ-… o número de DNI"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 px-4"
          />
          <Button type="submit" disabled={busy}>
            Buscar cliente
          </Button>
        </form>
      </div>

      {busy && <p className="text-sm text-muted">Validando…</p>}
      {error && (
        <p
          role="alert"
          className="break-words rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {decision && (
        <p
          role="status"
          className="break-words rounded-xl bg-green-50 p-4 text-sm text-green-900"
        >
          {decision.message}
        </p>
      )}

      {scan && (
        <article className="min-w-0 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                {scan.isPrimary ? "Titular de la reserva" : "Acompañante"}
              </p>
              <h3 className="mt-1 break-words text-xl font-bold">
                {scan.load.personName}
              </h3>
              <p className="mt-1 text-sm text-muted">
                DNI {scan.load.dni} · Reserva {scan.reservation.fullName} ·{" "}
                {scan.reservation.partySize}{" "}
                {scan.reservation.partySize === 1 ? "persona" : "personas"}
              </p>
            </div>
            <Badge
              status={
                scan.load.accessStatus === "ADMITTED"
                  ? "APPROVED"
                  : scan.load.accessStatus === "REJECTED"
                    ? "REJECTED"
                    : scan.load.accessStatus === "DELIVERED"
                      ? "DELIVERED"
                      : "PENDING"
              }
            />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Entrada</dt>
              <dd className="font-semibold">
                {scan.load.productName || scan.reservation.entryProductName}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Evento</dt>
              <dd className="font-semibold">
                {dateLabel(scan.load.eventDate)}
                {scan.load.eventPlace ? ` · ${scan.load.eventPlace}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Pago</dt>
              <dd className="font-semibold">
                {scan.reservation.paymentStatus === "PAID"
                  ? "Verificado"
                  : "Pendiente de verificación"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Estado del QR</dt>
              <dd className="font-semibold">
                {ACCESS_LABELS[scan.load.accessStatus] ??
                  scan.load.accessStatus}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Consumición incluida</dt>
              <dd className="font-semibold">
                {scan.load.consumptionItem ?? "No incluye consumición"}
              </dd>
            </div>
          </dl>

          {scan.load.rejectionReason && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Rechazo registrado: {scan.load.rejectionReason}
            </p>
          )}
          {scan.load.admittedAt && (
            <p className="mt-2 text-xs text-muted">
              Ingreso activado: {timeLabel(scan.load.admittedAt)}
            </p>
          )}
          {scan.load.deliveredAt && (
            <p className="mt-2 text-xs text-muted">
              Consumición retirada: {timeLabel(scan.load.deliveredAt)}
            </p>
          )}
          {!scan.matchesCurrentEvent && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Este QR es de otro evento. Configurá el evento actual en Catálogo
              antes de activar.
            </p>
          )}

          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl bg-paper p-3 text-center sm:flex-row sm:text-left">
            <ClientQRCode value={scan.load.qrCode} size={96} level="H" />
            <div className="min-w-0">
              <p className="text-xs text-muted">QR único permanente</p>
              <p className="break-all font-mono text-[11px]">
                {scan.load.qrCode}
              </p>
            </div>
          </div>

          {scan.pendingEvent && (
            <div className="mt-5 rounded-xl border border-gold/40 p-4">
              <p className="mb-3 text-sm font-bold">
                ¿Todo correcto? Tomá la decisión
              </p>
              {!rejecting ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    className="min-h-12 text-base"
                    disabled={busy}
                    onClick={() => void sendDecision("ACTIVATE")}
                  >
                    Activar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-12 text-base"
                    disabled={busy}
                    onClick={() => setRejecting(true)}
                  >
                    Rechazar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Motivo del rechazo</span>
                    <select
                      value={reasonCode}
                      onChange={(event) => setReasonCode(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 font-normal"
                    >
                      <option value="">Elegí un motivo</option>
                      <option value="MISSING_ID">Sin DNI</option>
                      <option value="DRESS_CODE">Vestimenta no acorde</option>
                      <option value="SAFETY_CONCERN">Seguridad</option>
                      <option value="CONDUCT">Conducta</option>
                      <option value="CAPACITY_REACHED">Aforo completo</option>
                      <option value="NOT_ON_LIST">No figura en la lista</option>
                      <option value="PAYMENT_UNVERIFIED">
                        Pago no verificado
                      </option>
                      <option value="OTHER_OBJECTIVE_REASON">
                        Otro motivo
                      </option>
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-semibold">
                    <span>Explicación breve (obligatoria)</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Ej.: no presenta DNI físico, vestimenta deportiva, etc."
                      className="w-full rounded-xl border border-black/10 px-3 py-2 font-normal"
                    />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="danger"
                      className="min-h-12 sm:w-auto"
                      disabled={busy || reason.trim().length < 8}
                      onClick={() => void sendDecision("REJECT")}
                    >
                      Confirmar rechazo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 sm:w-auto"
                      disabled={busy}
                      onClick={() => setRejecting(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {scan.consumptionAvailable && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Este QR ya fue activado a las {timeLabel(scan.load.admittedAt)}.
              La consumición se entrega en Barra escaneando el mismo código.
            </p>
          )}
          {!scan.pendingEvent &&
            !scan.consumptionAvailable &&
            !scan.load.rejectionReason && (
              <p className="mt-5 rounded-xl bg-paper p-4 text-sm">
                Este QR no está habilitado para activarse ahora. Si el cliente
                debe ingresar, pedí apoyo a administración.
              </p>
            )}
        </article>
      )}
    </div>
  );
}
