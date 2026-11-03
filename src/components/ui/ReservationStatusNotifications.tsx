"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import type { ReservationStatus } from "@/types";
import { readApiResponse } from "@/lib/client-api";

type Notification = {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
};
type Payload = {
  reservation: { id: string; status: ReservationStatus; fullName: string };
  notifications: Notification[];
  qr: { code: string; imageUrl: string } | null;
  loads: Array<{
    id: string;
    personName: string;
    accessStatus: string;
    consumptionItem: string | null;
    admittedAt: string | null;
    deliveredAt: string | null;
    deactivatedAt: string | null;
  }>;
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function seenStorageKey(reservationId: string) {
  return `mauifest:reservation:${reservationId}:seen-notifications`;
}

export function ReservationStatusNotifications({
  reservationId,
  initialStatus,
}: {
  reservationId: string;
  initialStatus: ReservationStatus;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [qr, setQr] = useState<{ code: string; imageUrl: string } | null>(null);
  const [loads, setLoads] = useState<Payload["loads"]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const statusRef = useRef(initialStatus);

  // El primer render debe coincidir con el HTML del servidor: las notificaciones y el
  // localStorage se leen después del montaje.
  useEffect(() => {
    statusRef.current = initialStatus;
  }, [initialStatus]);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/reserva/${encodeURIComponent(reservationId)}/notificaciones`,
        { cache: "no-store" },
      );
      const result = await readApiResponse<Payload>(response);
      setError("");
      setNotifications(result.notifications);
      setQr(result.qr);
      setLoads(result.loads ?? []);
      if (result.reservation.status !== statusRef.current) {
        statusRef.current = result.reservation.status;
        router.refresh();
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron consultar las notificaciones.",
      );
    }
  }, [reservationId, router]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(seenStorageKey(reservationId));
      if (raw) setSeen(JSON.parse(raw) as string[]);
    } catch {
      // Sin historial local: se muestran todas como nuevas.
    }
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications, reservationId]);

  const unread = notifications.filter(
    (notification) => !seen.includes(notification.id),
  );

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && notifications.length) {
      const ids = notifications.map((notification) => notification.id);
      setSeen(ids);
      window.localStorage.setItem(
        seenStorageKey(reservationId),
        JSON.stringify(ids),
      );
    }
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={
          unread.length ? "Abrir notificaciones nuevas" : "Abrir notificaciones"
        }
        aria-expanded={open}
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-ink hover:bg-neutral-50"
      >
        <Bell size={18} aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-10 w-72 max-w-[85vw] space-y-3 rounded-xl border border-black/10 bg-white p-3 text-sm shadow-card"
          role="status"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Notificaciones
          </p>
          {notifications.length === 0 && (
            <p className="text-muted">Todavía no hay notificaciones.</p>
          )}
          {notifications.map((notification) => (
            <p
              key={notification.id}
              className="rounded-lg bg-paper p-2 leading-5"
            >
              {notification.message}
            </p>
          ))}
          {qr && (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-paper p-2 text-center">
              <ClientQRCode value={qr.code} size={120} level="H" />
              <p className="break-all font-mono text-[11px]">{qr.code}</p>
              <p className="text-[11px] text-muted">
                Presentá este QR junto con tu DNI en la puerta.
              </p>
            </div>
          )}
          {!qr && loads.some((load) => load.deliveredAt) && (
            <div className="rounded-lg bg-paper p-2">
              <p className="font-semibold">Ya retiró su consumición</p>
              {loads.filter((load) => load.deliveredAt).map((load) => (
                <p key={load.id} className="mt-1 text-xs text-muted">
                  {load.personName}{load.consumptionItem ? ` · ${load.consumptionItem}` : ""} · {timeLabel(load.deliveredAt!)}
                </p>
              ))}
              <p className="mt-1 text-[11px] text-muted">El QR de este evento ya no está activo.</p>
            </div>
          )}
          {!qr && !loads.some((load) => load.deliveredAt) && loads.some((load) => load.deactivatedAt) && (
            <p className="rounded-lg bg-paper p-2 text-xs text-muted">Tu QR fue desactivado por el equipo del evento. Consultá en puerta para volver a habilitarlo.</p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
