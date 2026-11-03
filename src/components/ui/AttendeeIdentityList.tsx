"use client";

import type { ReservationStatus } from "@/types";

type AttendeeIdentity = {
  role: string;
  fullName: string;
  dni: string;
  birthDate: string | null;
  checkedInAt: string | null;
  wristbandCode: string | null;
  qrCode?: string | null;
};

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(date);
}

export function AttendeeIdentityList({ attendees, partySize, reservationStatus, pendingLabel, showStatus = true }: { attendees: AttendeeIdentity[]; partySize: number; reservationStatus: ReservationStatus; pendingLabel?: string; showStatus?: boolean }) {
  // Un solo estado por persona: si la solicitud todavía espera decisión, "Pendiente"; si ya fue aprobada, la persona queda pendiente solo de acreditarse en la puerta.
  const defaultPendingLabel = reservationStatus === "PENDING" ? "Pendiente" : reservationStatus === "APPROVED" ? "Pago a confirmar" : "Pendiente en puerta";
  const statusLabel = pendingLabel ?? defaultPendingLabel;
  return (
    <section className="mt-5 rounded-xl bg-paper p-4" aria-label="Identidades individuales de la reserva">
      <h3 className="font-bold">Identidad y pulsera por persona</h3>
      <p className="mt-1 text-xs text-muted">Cada persona se valida con su propio DNI y recibe un código de pulsera único.</p>
      {attendees.length !== partySize && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">La reserva indica {partySize} personas, pero hay {attendees.length} identidades registradas. Completá los datos faltantes antes de habilitar el ingreso.</p>}
      <p className="mt-2 text-xs text-muted">{attendees.length} de {partySize} identidades cargadas</p>
      <ol className="mt-3 space-y-3">
        {attendees.map((attendee, index) => (
          <li key={`${attendee.dni}-${index}`} className="rounded-xl border border-black/5 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-semibold">{index + 1}. {attendee.fullName}</p><p className="mt-1 text-xs text-muted">{attendee.role} · DNI {attendee.dni}{attendee.birthDate ? ` · Nacimiento ${dateLabel(attendee.birthDate)}` : ""}</p></div>
              {showStatus && <span className={reservationStatus === "REJECTED" ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-900" : attendee.wristbandCode ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900" : attendee.qrCode && reservationStatus === "ACTIVATED" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"}>{reservationStatus === "REJECTED" ? "Solicitud rechazada" : attendee.wristbandCode ? "Pulsera activada" : attendee.qrCode && reservationStatus === "ACTIVATED" ? "QR emitido" : statusLabel}</span>}
            </div>
            {attendee.checkedInAt && <p className="mt-2 text-xs text-muted">Ingresó: {dateTimeLabel(attendee.checkedInAt)}</p>}
            {attendee.wristbandCode && <p className="mt-2 break-all font-mono text-xs">ID único: {attendee.wristbandCode}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
