"use client";

import { useState } from "react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { DniScanner } from "@/components/scanners/DniScanner";
import { Button } from "@/components/ui/Button";

type BarScan = {
  load: {
    id: string;
    personName: string;
    dni: string;
    qrCode: string;
    productName: string;
    eventDate: string | null;
    eventPlace: string | null;
    consumptionItem: string | null;
    accessStatus: string;
    admittedAt: string | null;
    deliveredAt: string | null;
    deactivatedAt: string | null;
  };
  reservation: {
    id: string;
    fullName: string;
    status: string;
    paymentStatus: string;
  };
};

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

export default function BarScanPage() {
  const [code, setCode] = useState("");
  const [scan, setScan] = useState<BarScan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(value: string) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/barra/qr", {
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
  }

  async function deliver(deactivateOnly = false) {
    if (!scan) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/barra/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: scan.load.qrCode, deactivateOnly }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "No se pudo registrar la entrega.");
      setMessage(result.message);
      setScan(null);
      setCode("");
    } catch (deliverError) {
      setError(
        deliverError instanceof Error
          ? deliverError.message
          : "Ocurrió un error.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-5">
      <div>
        <h2 className="text-2xl font-black">Entrega de consumiciones</h2>
        <p className="mt-1 text-sm text-muted">
          Escaneá el QR del cliente. Solo se entrega si puerta ya lo activó. Al
          entregar, el QR se desactiva y el cliente ve «Ya retiró su
          consumición» con el horario exacto.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 sm:p-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (code.trim()) void lookup(code.trim());
          }}
          className="space-y-3"
        >
          <DniScanner value={code} onChange={setCode} label="Código QR del cliente" placeholder="Escaneá o escribí MFQ-…" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={busy || !code.trim()}>
              Buscar QR
            </Button>
          </div>
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
      {message && (
        <p
          role="status"
          className="break-words rounded-xl bg-green-50 p-4 text-sm text-green-900"
        >
          {message}
        </p>
      )}

      {scan && (
        <article className="min-w-0 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ClientQRCode value={scan.load.qrCode} size={112} level="H" />
            <div className="min-w-0 text-center sm:text-left">
              <h3 className="break-words text-xl font-bold">
                {scan.load.personName}
              </h3>
              <p className="mt-1 text-sm text-muted">
                DNI {scan.load.dni} · Reserva {scan.reservation.fullName}
              </p>
              <p className="mt-2 text-sm">
                Consumición:{" "}
                <strong>
                  {scan.load.consumptionItem ?? "Sin consumición incluida"}
                </strong>
              </p>
              {scan.load.admittedAt && (
                <p className="mt-1 text-xs text-muted">
                  Activado en puerta: {timeLabel(scan.load.admittedAt)}
                </p>
              )}
              {scan.load.deliveredAt && (
                <p className="mt-1 text-xs text-muted">
                  Retirada: {timeLabel(scan.load.deliveredAt)}
                </p>
              )}
            </div>
          </div>

          {scan.load.accessStatus === "ADMITTED" &&
          !scan.load.deliveredAt &&
          !scan.load.deactivatedAt ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="min-h-12 sm:w-auto"
                disabled={busy}
                onClick={() => void deliver(false)}
              >
                Entregar consumición y desactivar QR
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 sm:w-auto"
                disabled={busy}
                onClick={() => void deliver(true)}
              >
                Solo desactivar QR
              </Button>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {scan.load.deliveredAt
                ? `La consumición ya fue retirada a las ${timeLabel(scan.load.deliveredAt)}.`
                : "El QR todavía no está activo: primero puerta debe activarlo."}
            </p>
          )}
        </article>
      )}
    </div>
  );
}
