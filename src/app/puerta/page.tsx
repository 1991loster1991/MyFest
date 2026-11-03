"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { DoorScanner } from "@/components/scanners/DoorScanner";
import { IncidentRecorder } from "@/components/puerta/IncidentRecorder";
import { DoorGuestSearch } from "@/components/puerta/DoorGuestSearch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Attendee = { fullName: string; dni: string; checkedInAt?: string | null; wristbandCode?: string | null };
type Guest = {
  id: string;
  fullName: string;
  dni: string;
  partySize: number;
  status: string;
  wristbandCode: string | null;
  checkedInAt?: string | null;
  guests?: Attendee[];
};
type OfflineGuest = Pick<Guest, "id" | "fullName" | "dni" | "partySize" | "checkedInAt" | "wristbandCode" | "guests">;
type OfflineCheckin = { reservationId: string; dni: string; wristbandCode: string };

const SNAPSHOT_KEY = "mauifest.door.snapshot.v1";
const QUEUE_KEY = "mauifest.door.checkins.v1";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function dniFromBarcode(value: string) {
  const argentinaDni = value.match(/IDARG\s*(\d{7,8})/i);
  if (argentinaDni) return argentinaDni[1];
  const trimmed = value.trim();
  return /^\d{6,20}$/.test(trimmed) ? trimmed : null;
}

function reservationIdFromQr(value: string) {
  const scannedValue = value.trim();
  try {
    const url = new URL(scannedValue);
    const reservationId = url.searchParams.get("reserva") ?? url.searchParams.get("id");
    if (reservationId) return reservationId;
    const routeMatch = url.pathname.match(/^\/reserva\/([^/]+)\/?$/);
    if (routeMatch) return decodeURIComponent(routeMatch[1]);
  } catch {
    // Los códigos QR anteriores contienen directamente el ID de reserva.
  }
  return scannedValue;
}

export default function DoorPage() {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [snapshot, setSnapshot] = useState<OfflineGuest[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [presentedDni, setPresentedDni] = useState("");
  const [activatedAttendee, setActivatedAttendee] = useState<Attendee | null>(null);

  const downloadSnapshot = useCallback(async () => {
    if (!navigator.onLine) {
      setMessage("Estás sin conexión. Se conserva la última lista descargada.");
      return;
    }
    try {
      const response = await fetch("/api/puerta/offline-snapshot", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo descargar la lista.");
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(result.reservations));
      setSnapshot(result.reservations);
      setMessage(`Lista offline actualizada: ${result.reservations.length} entradas autorizadas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descargar la lista.");
    }
  }, []);

  const syncOfflineCheckins = useCallback(async () => {
    if (!navigator.onLine) return;
    const queued = readLocal<Array<string | OfflineCheckin>>(QUEUE_KEY, []);
    if (!queued.length) return;
    try {
      const response = await fetch("/api/puerta/sync-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationIds: queued })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo sincronizar el acceso.");
      const conflicts = result.results.filter((item: { synced: boolean }) => !item.synced).length;
      const failedQueue = queued.filter((_item, index) => !result.results[index]?.synced);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
      setPendingIds(failedQueue.map((item) => typeof item === "string" ? item : item.reservationId));
      setMessage(conflicts ? `${queued.length - conflicts} ingresos sincronizados; ${conflicts} requieren revisión porque el ticket ya fue usado.` : `${queued.length} ingresos offline sincronizados.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar la cola.");
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setSnapshot(readLocal<OfflineGuest[]>(SNAPSHOT_KEY, []));
    const queued = readLocal<Array<string | OfflineCheckin>>(QUEUE_KEY, []);
    setPendingIds(queued.map((item) => typeof item === "string" ? item : item.reservationId));
    const handleOnline = () => {
      setOnline(true);
      void syncOfflineCheckins();
      void downloadSnapshot();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (navigator.onLine) {
      void downloadSnapshot();
      void syncOfflineCheckins();
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [downloadSnapshot, syncOfflineCheckins]);

  async function lookup(value: string) {
    setBusy(true);
    setMessage("");
    const dni = dniFromBarcode(value);
    setPresentedDni(dni ?? "");
    setActivatedAttendee(null);
    const reservationId = reservationIdFromQr(value);
    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch("/api/puerta/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dni ? { dni } : { reservationId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se encontró una entrada válida.");
        setGuest(result.reservation);
    } catch (error) {
      if (error instanceof Error && error.message !== "offline") {
        setGuest(null);
        setMessage(error.message);
      } else {
        const match = snapshot.find((item) => dni
          ? item.dni.replace(/\D/g, "") === dni || Boolean(item.guests?.some((companion) => companion.dni.replace(/\D/g, "") === dni))
          : item.id === reservationId);
        if (!match) {
          setGuest(null);
          setMessage("No figura en la última lista offline. Verificá la conexión o pedí apoyo a administración.");
        } else if (pendingIds.includes(match.id)) {
          setGuest({ ...match, status: "APPROVED" });
          setMessage("Esta reserva tiene al menos un ingreso pendiente de sincronización en este dispositivo.");
        } else {
          setGuest({ ...match, status: "APPROVED" });
          setMessage("Entrada validada con la última lista guardada en este dispositivo.");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!guest) return;
    const dni = presentedDni.replace(/\D/g, "");
    if (!dni) {
      setMessage("Ingresá el DNI que presenta la persona para verificarlo y activar la pulsera.");
      return;
    }
    setBusy(true);
    try {
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch("/api/puerta/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: guest.id, dni, confirm: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar el ingreso.");
      setGuest(result.reservation);
      setActivatedAttendee(result.activatedAttendee);
      setPresentedDni("");
      setMessage(`DNI verificado. Pulsera única ${result.activatedAttendee.wristbandCode} activada para ${result.activatedAttendee.fullName}.`);
    } catch (error) {
      if (error instanceof Error && error.message !== "offline") {
        setMessage(error.message);
      } else {
        const normalizedDni = dni.replace(/\D/g, "");
        const person = normalizedDni === guest.dni.replace(/\D/g, "")
          ? { fullName: guest.fullName, dni: guest.dni, checkedInAt: guest.checkedInAt, wristbandCode: guest.wristbandCode, primary: true }
          : guest.guests?.find((item) => item.dni.replace(/\D/g, "") === normalizedDni)
            ? { ...guest.guests.find((item) => item.dni.replace(/\D/g, "") === normalizedDni)!, primary: false }
            : null;
        if (!person) {
          setMessage("El DNI no coincide con ninguna persona de esta reserva.");
        } else if (person.checkedInAt || person.wristbandCode) {
          setMessage("Esta persona ya tiene el ingreso o la pulsera activada.");
        } else {
          const queued = readLocal<Array<string | OfflineCheckin>>(QUEUE_KEY, []);
          if (queued.some((entry) => typeof entry !== "string" && entry.reservationId === guest.id && entry.dni === normalizedDni)) {
            setMessage("Este DNI ya tiene un ingreso y una pulsera en la cola offline de este dispositivo.");
            return;
          }
          const code = `MF-${crypto.randomUUID().toUpperCase()}`;
          const item = { reservationId: guest.id, dni: normalizedDni, wristbandCode: code };
          const next = [...queued, item];
          localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
          setPendingIds(next.map((entry) => typeof entry === "string" ? entry : entry.reservationId));
          const now = new Date().toISOString();
          const updatedGuest: Guest = person.primary
            ? { ...guest, checkedInAt: now, wristbandCode: code }
            : { ...guest, guests: guest.guests?.map((entry) => entry.dni === person.dni ? { ...entry, checkedInAt: now, wristbandCode: code } : entry) };
          const allIn = Boolean(updatedGuest.checkedInAt) && (updatedGuest.guests ?? []).every((entry) => entry.checkedInAt);
          if (allIn) updatedGuest.status = "CHECKED_IN";
          setGuest(updatedGuest);
          setActivatedAttendee({ fullName: person.fullName, dni: person.dni, checkedInAt: now, wristbandCode: code });
          setPresentedDni("");
          setMessage(`DNI verificado con la lista offline. Pulsera única ${code} activada localmente y pendiente de sincronización.`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-5">
      <div>
        <h2 className="text-2xl font-black">Control de acceso</h2>
        <p className="mt-1 text-sm text-muted">Escaneá QR o PDF417 del DNI. Solo ingresan reservas aprobadas y pagos verificados; compará la identidad y mayoría de edad con el documento.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 text-sm">
        <span className={online ? "font-semibold text-green-800" : "font-semibold text-amber-800"}>{online ? "Con conexión" : "Sin conexión"}</span>
        <span className="text-muted">{snapshot.length} en lista offline · {pendingIds.length} ingresos por sincronizar</span>
        <Button type="button" variant="secondary" className="ml-auto" onClick={() => void downloadSnapshot()} disabled={!online}>Descargar lista</Button>
      </div>
      {!online && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La validación offline usa la última lista de este dispositivo. Otros puestos desconectados no reciben los check-ins hasta sincronizar; coordiná una sola fila offline si es posible.</p>}
      <DoorScanner onScan={lookup} />
      <DoorGuestSearch offlineGuests={snapshot} onSelect={lookup} />
      <div className="rounded-2xl bg-white p-4">
        <p className="mb-3 text-sm font-semibold">También podés ingresar un ID de reserva o DNI</p>
        <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const code = String(data.get("code") ?? "").trim(); if (code) void lookup(code); }} className="flex flex-col gap-3 sm:flex-row">
          <input name="code" aria-label="ID de reserva o DNI" placeholder="ID de reserva o DNI" className="min-h-11 min-w-0 flex-1 rounded-xl border border-black/10 px-4" />
          <Button type="submit">Buscar entrada</Button>
        </form>
      </div>
      {busy && <p className="text-sm text-muted">Validando entrada...</p>}
      {message && <p role="status" className="break-words rounded-xl bg-white p-4 text-sm">{message}</p>}
      {guest && (
        <article className="min-w-0 rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="break-words text-xl font-bold">{guest.fullName}</h3><p className="mt-1 break-all text-sm text-muted">DNI {guest.dni} · {guest.partySize} personas</p></div>
            <Badge status={guest.status} />
          </div>
          <div className="mt-5 rounded-xl bg-paper p-4">
            <p className="mb-2 text-sm font-bold">Personas de la reserva</p>
            <ul className="space-y-2 text-sm">
              {[{ fullName: guest.fullName, dni: guest.dni, checkedInAt: guest.checkedInAt, wristbandCode: guest.wristbandCode }, ...(guest.guests ?? [])].map((person) => (
                <li key={person.dni} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{person.fullName} · DNI {person.dni}{person.checkedInAt ? ` · Ingresó ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(person.checkedInAt))}` : ""}</span>
                  <span className={person.wristbandCode ? "font-semibold text-green-800" : "text-muted"}>{person.wristbandCode ? `Pulsera única ${person.wristbandCode}` : "Pendiente de validar DNI"}</span>
                </li>
              ))}
            </ul>
          </div>
          {guest.status === "APPROVED" && (
            <form onSubmit={(event) => { event.preventDefault(); void checkIn(); }} className="mt-5 grid gap-3 rounded-xl border border-gold/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block space-y-2 text-sm font-semibold">
                <span>DNI presentado para verificar y activar pulsera</span>
                <input value={presentedDni} onChange={(event) => setPresentedDni(event.target.value)} inputMode="numeric" autoComplete="off" required placeholder="Ingresá el número de DNI" className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 font-normal outline-none focus:border-ink" />
              </label>
              <Button className="min-h-12" disabled={busy}>Verificar DNI y activar pulsera</Button>
            </form>
          )}
          {activatedAttendee?.wristbandCode && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-green-900/10 bg-green-50 p-5 text-center sm:flex-row sm:text-left">
              <ClientQRCode value={activatedAttendee.wristbandCode} size={112} level="H" />
              <div><p className="font-bold text-green-950">Pulsera activada para {activatedAttendee.fullName}</p><p className="mt-1 break-all font-mono text-sm">ID único: {activatedAttendee.wristbandCode}</p><p className="mt-1 text-xs text-green-900">Asigná este código QR a la pulsera física de la persona.</p></div>
            </div>
          )}
        </article>
      )}
      <IncidentRecorder reservationId={guest?.id} />
    </div>
  );
}
