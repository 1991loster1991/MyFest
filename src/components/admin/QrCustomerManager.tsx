"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClientQRCode } from "@/components/ui/ClientQRCode";

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
  deactivatedAt: string | null;
  deactivatedBy: string | null;
};

type Result = {
  load: Load;
  reservation: {
    id: string;
    fullName: string;
    status: string;
    paymentStatus: string;
  };
  isActive: boolean;
  history: Load[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Sin activar",
  ADMITTED: "Activado en puerta",
  REJECTED: "Rechazado",
  DELIVERED: "Consumición retirada",
};

function dateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export function QrCustomerManager() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/qr-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "No se pudo consultar el QR.");
      setResult(data);
    } catch (scanError) {
      setResult(null);
      setError(
        scanError instanceof Error ? scanError.message : "Ocurrió un error.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(active: boolean) {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/qr-cliente/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: result.load.qrCode, active }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "No se pudo actualizar el QR.");
      setMessage(data.message);
      await scan();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Ocurrió un error.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) void scan();
        }}
        className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row"
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-label="Código QR o DNI del cliente"
          placeholder="Código QR (MFQ-…) o DNI"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 px-4"
        />
        <Button type="submit" disabled={busy || !code.trim()}>
          Buscar cliente
        </Button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-4 text-sm text-green-900"
        >
          {message}
        </p>
      )}

      {result && (
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <ClientQRCode value={result.load.qrCode} size={128} level="H" />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-bold">
                {result.load.personName}
              </h3>
              <p className="mt-1 text-sm text-muted">
                DNI {result.load.dni} · Reserva {result.reservation.fullName}
              </p>
              <p className="mt-2 break-all font-mono text-xs">
                {result.load.qrCode}
              </p>
              <p className="mt-2 text-sm">
                Estado:{" "}
                <strong>
                  {STATUS_LABELS[result.load.accessStatus] ??
                    result.load.accessStatus}
                </strong>
                {result.load.deactivatedAt
                  ? ` · desactivado ${result.load.deactivatedBy === "BAR" ? "en barra" : "por administración"} (${dateTime(result.load.deactivatedAt)})`
                  : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {result.load.consumptionItem ?? "Sin consumición incluida"}
                {result.load.deliveredAt
                  ? ` · retirada ${dateTime(result.load.deliveredAt)}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || result.isActive}
                onClick={() => void toggle(true)}
              >
                Activar QR
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busy || !result.isActive}
                onClick={() => void toggle(false)}
              >
                Desactivar QR
              </Button>
            </div>
          </div>

          {result.history.length > 1 && (
            <section className="mt-5 border-t border-black/5 pt-4">
              <h4 className="text-sm font-bold">
                Historial de cargas del cliente
              </h4>
              <ul className="mt-2 space-y-2 text-sm">
                {result.history.map((load) => (
                  <li key={load.id} className="rounded-xl bg-paper p-3">
                    <span className="font-semibold">
                      {load.productName || "Entrada"}
                    </span>
                    <span className="ml-2 text-muted">
                      {STATUS_LABELS[load.accessStatus] ?? load.accessStatus}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {load.eventDate ?? "Sin fecha"}
                      {load.eventPlace ? ` · ${load.eventPlace}` : ""}
                      {load.admittedAt
                        ? ` · Ingreso ${dateTime(load.admittedAt)}`
                        : ""}
                      {load.deliveredAt
                        ? ` · Consumición ${dateTime(load.deliveredAt)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </div>
  );
}
