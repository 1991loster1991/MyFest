"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { ReservationStatus } from "@/types";
import { readApiResponse } from "@/lib/client-api";

function notificationStorageKey(reservationId: string) {
  return `mauifest:reservation:${reservationId}:notification`;
}

function seenStorageKey(reservationId: string) {
  return `mauifest:reservation:${reservationId}:seen-status`;
}

function notificationMessage(status: ReservationStatus) {
  return status === "APPROVED"
    ? "Tu solicitud fue aprobada."
    : status === "REJECTED"
      ? "Tu solicitud fue rechazada."
      : "";
}

export function ReservationStatusNotifications({ reservationId, initialStatus }: { reservationId: string; initialStatus: ReservationStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notification, setNotification] = useState<ReservationStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const notificationKey = notificationStorageKey(reservationId);
    const seenKey = seenStorageKey(reservationId);
    const savedNotification = window.localStorage.getItem(notificationKey) as ReservationStatus | null;
    const seenStatus = window.localStorage.getItem(seenKey);
    if ((initialStatus === "APPROVED" || initialStatus === "REJECTED") && seenStatus !== initialStatus) {
      window.localStorage.setItem(notificationKey, initialStatus);
      setNotification(initialStatus);
    } else if (savedNotification && savedNotification !== seenStatus) {
      setNotification(savedNotification);
    } else if (savedNotification) {
      window.localStorage.removeItem(notificationKey);
    }

    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/reserva/${encodeURIComponent(reservationId)}/estado`, { cache: "no-store" });
        const result = await readApiResponse<{ reservation: { status: ReservationStatus } }>(response);
        if (!active) return;
        const latestStatus = result.reservation.status as ReservationStatus;
        setError("");
        if (latestStatus !== status) {
          setStatus(latestStatus);
          if (latestStatus === "APPROVED" || latestStatus === "REJECTED") {
            window.localStorage.setItem(notificationKey, latestStatus);
            window.localStorage.removeItem(seenKey);
            setNotification(latestStatus);
          }
          router.refresh();
        }
      } catch (statusError) {
        if (active) setError(statusError instanceof Error ? statusError.message : "No se pudo consultar el estado de la solicitud.");
      }
    };

    void checkStatus();
    const intervalId = window.setInterval(() => { void checkStatus(); }, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [initialStatus, reservationId, router, status]);

  function acknowledgeNotification() {
    if (notification) {
      window.localStorage.setItem(seenStorageKey(reservationId), notification);
      window.localStorage.removeItem(notificationStorageKey(reservationId));
      setNotification(null);
    }
    setOpen((currentlyOpen) => !currentlyOpen);
  }

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label={notification ? "Abrir notificación nueva" : "Abrir notificaciones"}
        aria-expanded={open}
        onClick={acknowledgeNotification}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-ink hover:bg-neutral-50"
      >
        <Bell size={18} aria-hidden="true" />
        {notification && <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">1</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-10 w-64 rounded-xl border border-black/10 bg-white p-3 text-sm shadow-card" role="status">
          {notification ? notificationMessage(notification) : notificationMessage(status) || "Todavía no hay notificaciones."}
        </div>
      )}
      {error && <span role="alert" className="absolute right-0 top-12 z-10 w-64 rounded-xl bg-red-50 p-3 text-xs text-red-800 shadow-card">{error}</span>}
    </div>
  );
}
