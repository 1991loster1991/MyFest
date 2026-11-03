"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Period = { id: string; name: string; startedAt: string; endedAt: string | null };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

export function EventPeriodControls({ activePeriod, previousPeriods, preReservaOpen: initialOpen }: { activePeriod: Period; previousPeriods: Period[]; preReservaOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preReservaOpen, setPreReservaOpen] = useState(initialOpen);
  const [gateMessage, setGateMessage] = useState("");

  async function togglePreReserva(next: boolean) {
    setBusy(true);
    setError("");
    setGateMessage("");
    try {
      const response = await fetch("/api/admin/inscripciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: next })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo actualizar las inscripciones.");
      setPreReservaOpen(result.open);
      setGateMessage(result.message);
      router.refresh();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar las inscripciones.");
    } finally {
      setBusy(false);
    }
  }

  async function startNewPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("Se iniciará un período de métricas nuevo. Las reservas, los clientes y el personal se conservarán; solo cambiará el período que muestra el Resumen.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/event-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo iniciar el evento.");
      setName("");
      setOpen(false);
      router.refresh();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "No se pudo iniciar el evento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-no-print mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">Período activo</p>
          <h2 className="mt-1 text-lg font-bold">{activePeriod.name}</h2>
          <p className="mt-1 text-sm text-muted">Desde {formatDate(activePeriod.startedAt)}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((current) => !current)}>{open ? "Cancelar" : "Iniciar otro evento"}</Button>
      </div>
      {open && (
        <form onSubmit={(event) => void startNewPeriod(event)} className="mt-5 grid gap-3 border-t border-black/5 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input label="Nombre del nuevo evento" name="event-period-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} placeholder="Ej.: Maui Fest · Temporada verano" />
          <Button disabled={busy}>{busy ? "Iniciando…" : "Iniciar y reiniciar métricas"}</Button>
          {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
          <p className="text-xs leading-5 text-muted sm:col-span-2">Esto no borra ni modifica reservas, clientes o personal. El historial de períodos anteriores se conserva.</p>
        </form>
      )}
      <div className="mt-5 rounded-2xl border border-black/5 bg-paper p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">Inscripciones de pre-reserva</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {preReservaOpen
                ? "El formulario está abierto y acepta solicitudes."
                : "El formulario está bloqueado: el botón de envío permanece deshabilitado."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || preReservaOpen} onClick={() => void togglePreReserva(true)}>Abrir inscripciones</Button>
            <Button type="button" variant="danger" disabled={busy || !preReservaOpen} onClick={() => void togglePreReserva(false)}>Cerrar inscripciones</Button>
          </div>
        </div>
        {gateMessage && <p role="status" className="mt-2 text-sm text-muted">{gateMessage}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
      {previousPeriods.length > 0 && (
        <details className="mt-5 border-t border-black/5 pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Eventos anteriores ({previousPeriods.length})</summary>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {previousPeriods.map((period) => <li key={period.id} className="flex flex-wrap justify-between gap-2"><span>{period.name}</span><span>{formatDate(period.startedAt)}{period.endedAt ? ` – ${formatDate(period.endedAt)}` : ""}</span></li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
