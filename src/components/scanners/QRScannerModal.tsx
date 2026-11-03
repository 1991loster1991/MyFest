"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function QRScannerModal({ onScan }: { onScan: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="min-w-0 rounded-2xl border border-dashed border-black/20 bg-white p-4 sm:p-5">
      <p className="mb-3 text-sm font-semibold">Ingreso manual del código QR</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Código de reserva"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Pegá o escribí el ID de la reserva"
          className="min-h-11 flex-1 rounded-xl border border-black/10 px-4 outline-none focus:border-ink"
        />
        <Button type="button" disabled={!value.trim()} onClick={() => onScan(value.trim())}>Buscar reserva</Button>
      </div>
      <p className="mt-3 break-words text-xs text-muted">La lectura por cámara requiere un lector compatible; este formulario permite operar con el código QR.</p>
    </div>
  );
}
