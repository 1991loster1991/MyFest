"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const reasons = [
  ["CAPACITY_REACHED", "Aforo completo"],
  ["MISSING_ID", "Falta de DNI"],
  ["DRESS_CODE", "Incumplimiento de dress code publicado"],
  ["SAFETY_CONCERN", "Protocolo objetivo de seguridad"],
  ["CONDUCT", "Conducta documentada"],
  ["OTHER_OBJECTIVE_REASON", "Otro motivo objetivo"]
] as const;

export function IncidentRecorder({ reservationId }: { reservationId?: string }) {
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("CAPACITY_REACHED");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/puerta/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId, reason, details })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar la incidencia.");
      setMessage(`Incidencia registrada · ${new Date(result.createdAt).toLocaleTimeString("es-AR")}`);
      setDetails("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-2xl border border-black/5 bg-white p-4">
      <summary className="cursor-pointer font-semibold">Registrar negativa / incidencia objetiva</summary>
      <p className="mt-2 text-xs leading-5 text-muted">Usá criterios públicos y verificables. No registrar raza, apariencia, identidad de género u otros atributos protegidos ni crear bloqueos automáticos.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block space-y-2 text-sm font-medium">
          <span>Motivo</span>
          <select value={reason} onChange={(event) => setReason(event.target.value as (typeof reasons)[number][0])} className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3">
            {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Detalle factual (opcional)</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={3} className="w-full rounded-xl border border-black/10 p-3" />
        </label>
        <Button type="submit" disabled={busy}>{busy ? "Guardando..." : "Registrar incidencia"}</Button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-muted">{message}</p>}
    </details>
  );
}
