"use client";

import { Button } from "@/components/ui/Button";
import { ClientQRCode } from "@/components/ui/ClientQRCode";

type Wristband = { reservationId: string; name: string; dni: string; code: string; checkedInAt: string };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

export function WristbandQrList({ wristbands, eventName }: { wristbands: Wristband[]; eventName: string }) {
  return (
    <div className="wristband-document">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{eventName} · {wristbands.length} pulsera(s) activada(s)</p>
        <Button type="button" className="wristband-no-print" variant="secondary" onClick={() => window.print()} disabled={!wristbands.length}>Imprimir QRs de pulsera</Button>
      </div>
      {wristbands.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wristbands.map((wristband) => (
            <article key={`${wristband.reservationId}-${wristband.dni}`} className="wristband-card flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-card">
              <ClientQRCode value={wristband.code} size={120} level="H" title={`Pulsera única de ${wristband.name}`} />
              <div className="min-w-0">
                <p className="break-words font-bold">{wristband.name}</p>
                <p className="mt-1 text-xs text-muted">DNI ···{wristband.dni.slice(-3)}</p>
                <p className="mt-2 break-all font-mono text-xs">{wristband.code}</p>
                <p className="mt-2 text-[11px] text-muted">Activada {formatDate(wristband.checkedInAt)}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-muted">Todavía no hay pulseras activadas para este evento. Se generan al verificar el DNI en Puerta.</p>
      )}
    </div>
  );
}
