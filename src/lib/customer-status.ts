import type { ReservationStatus } from "@/types";

export type CustomerStage = "PENDING" | "PAYING" | "APPROVED" | "QUEUE" | "ADMITTED" | "REJECTED";

type StageInput = {
  status: ReservationStatus;
  paymentStatus: string;
  eventDate: string | null;
};

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const RESET_HOUR = 6;

/** Fecha y hora actuales en Argentina, sin depender de la zona del servidor. */
function argentinaNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value])) as { year: string; month: string; day: string; hour: string };
  // `hour` puede venir como "24" a medianoche en algunos ICU: se normaliza a 0.
  const hour = Number(values.hour) % 24;
  return { date: `${values.year}-${values.month}-${values.day}`, hour };
}

/** Fecha calendario (AAAA-MM-DD) desplazada en días, sin desfase de zona. */
export function shiftDate(value: { year: string; month: string; day: string }, days: number) {
  const date = new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Nombre del estado que ve el cliente. */
export const STAGE_LABELS: Record<CustomerStage, string> = {
  PENDING: "Pendiente",
  PAYING: "Abonando",
  APPROVED: "Aprobado",
  QUEUE: "En cola",
  ADMITTED: "Ingresado",
  REJECTED: "Rechazada"
};

/** Mensaje que acompaña cada estado en la página del cliente. */
export function stageMessage(stage: CustomerStage, reservation: { fullName: string; partySize: number; entryProductName: string; totalCents: number }) {
  switch (stage) {
    case "PENDING":
      return "Recibimos tu solicitud. El equipo del evento la está revisando.";
    case "PAYING":
      return `Tu solicitud fue aceptada. Realizá la reserva por ${reservation.totalCents > 0 ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(reservation.totalCents / 100) : "el monto indicado"} y adjuntá el comprobante por WhatsApp. Aguardá la activación del equipo del evento.`;
    case "APPROVED":
      return "Tu pago fue verificado y tu reserva está aprobada. El día del evento vas a pasar automáticamente a la cola de ingreso: presentate con DNI en mano y vestimenta acorde (prohibido ropa deportiva).";
    case "QUEUE":
      return "¡Llegó el día! Ya estás en la cola de ingreso. Acercate a la puerta y presentá tu QR junto con tu DNI.";
    case "ADMITTED":
      return "Tu ingreso ya fue registrado. ¡Que disfrutes el evento!";
    case "REJECTED":
      return "Esta solicitud no pudo ser confirmada. Si necesitás ayuda, contactá al equipo del evento.";
  }
}

/**
 * Estado visible del cliente en este momento.
 * "Aprobado" solo se muestra cuando ya pasó todos los pasos (pago verificado y activación).
 * El día del evento pasa automáticamente a "En cola" y en puerta a "Ingresado".
 */
export function customerStage({ status, paymentStatus, eventDate }: StageInput, now = new Date()): CustomerStage {
  if (status === "REJECTED") return "REJECTED";
  const today = argentinaNow(now);
  const isEventDay = Boolean(eventDate) && eventDate === today.date;

  if (status === "CHECKED_IN") return "ADMITTED";
  if (status === "ACTIVATED") return isEventDay ? "QUEUE" : "APPROVED";
  if (status === "APPROVED") return paymentStatus === "PAID" ? (isEventDay ? "QUEUE" : "APPROVED") : "PAYING";
  return "PENDING";
}

/**
 * La reserva ya cumplió su ciclo (evento pasado o retiro cerrado) y debe limpiarse para
 * permitir una nueva pre-reserva: se remueve el día siguiente al evento después de las 06:00.
 */
export function shouldResetReservation({ eventDate }: { status: ReservationStatus; eventDate: string | null }, now = new Date()) {
  if (!eventDate) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;
  const today = argentinaNow(now);
  if (eventDate < today.date) return true;
  if (eventDate === today.date && today.hour >= RESET_HOUR) return true;
  return false;
}

/** ¿El formulario de pre-reserva está abierto? Solo si administración lo habilitó. */
export function preReservaGate(settings: { preReservaOpen: boolean; eventDate: string | null } | null, now = new Date()) {
  if (!settings) return { open: false, reason: "Las inscripciones todavía no están habilitadas. El equipo del evento las abrirá próximamente." };
  if (!settings.preReservaOpen) return { open: false, reason: "Las inscripciones están cerradas. El equipo del evento habilitará el formulario para el próximo evento." };
  if (settings.eventDate && shouldResetReservation({ status: "PENDING", eventDate: settings.eventDate }, now)) {
    return { open: false, reason: "El evento anterior ya finalizó. El equipo habilitará las inscripciones del próximo evento." };
  }
  return { open: true, reason: "" };
}
