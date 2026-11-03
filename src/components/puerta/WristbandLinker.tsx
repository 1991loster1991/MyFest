"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function WristbandLinker({ reservationId }: { reservationId: string }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function link(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/puerta/link-wristband", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, wristbandCode: code })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo asociar la pulsera.");
      setMessage(`Pulsera ${result.reservation.wristbandCode} asociada correctamente.`);
      setCode("");
    } catch (linkError) {
      setMessage(linkError instanceof Error ? linkError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={link} className="mt-5 flex flex-col gap-3 sm:flex-row">
      <input value={code} onChange={(event) => setCode(event.target.value)} required minLength={3} maxLength={80}
        placeholder="Código de pulsera NFC/QR" className="min-h-11 flex-1 rounded-xl border border-black/10 px-4 outline-none focus:border-ink" />
      <Button type="submit" disabled={busy}>{busy ? "Asociando..." : "Asociar pulsera"}</Button>
      {message && <p role="status" className="basis-full text-sm text-muted">{message}</p>}
    </form>
  );
}
