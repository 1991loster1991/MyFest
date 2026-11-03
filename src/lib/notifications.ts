import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export type ReservationNotificationKind = "ACCEPTED" | "PAYMENT_CONFIRMED" | "ACTIVATED" | "CONSUMPTION_DELIVERED" | "REJECTED";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

const EVENT_FALLBACK = {
  day: "5 de diciembre de 2026 · 22:00",
  place: "Salón Maui Fest",
  dressCode: "Aclaraciones: deberán concurrir con DNI en mano y vestimenta acorde. Prohibida la ropa deportiva."
};

function argentinaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function eventDayLabel(eventDate: string | null | undefined) {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate < argentinaToday()) return EVENT_FALLBACK.day;
  const date = new Date(`${eventDate}T12:00:00.000Z`);
  const label = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type EventDetails = { productName: string; eventDate: string | null; eventPlace: string | null; consumptionItem: string | null };

/** Datos del evento que se muestran al confirmar la reserva. */
export async function eventDetailsFor(entryProductName: string): Promise<EventDetails> {
  try {
    const product = await prisma.catalogProduct.findFirst({
      where: { type: "ENTRY", name: entryProductName },
      select: { eventDate: true, eventPlace: true, includedItem: true }
    });
    return {
      productName: entryProductName,
      eventDate: product?.eventDate ?? null,
      eventPlace: product?.eventPlace ?? null,
      consumptionItem: product?.includedItem ?? null
    };
  } catch (error) {
    console.error("Could not load event details", error);
    return { productName: entryProductName, eventDate: null, eventPlace: null, consumptionItem: null };
  }
}

export function eventLocation(event: EventDetails) {
  return {
    day: eventDayLabel(event.eventDate),
    place: event.eventPlace?.trim() || EVENT_FALLBACK.place
  };
}

/**
 * Código QR único e irrepetible: se verifica además contra todas las pulseras, reservas y
 * acompañantes ya emitidos para que nunca se repita entre dos personas.
 */
export async function newQrCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `MFQ-${randomUUID().toUpperCase().replace(/-/g, "").slice(0, 20)}`;
    const [reservation, guest, wristbandReservation, wristbandGuest, load] = await Promise.all([
      prisma.reservation.findFirst({ where: { qrCode: code }, select: { id: true } }),
      prisma.reservationGuest.findFirst({ where: { qrCode: code }, select: { id: true } }),
      prisma.reservation.findFirst({ where: { wristbandCode: code }, select: { id: true } }),
      prisma.reservationGuest.findFirst({ where: { wristbandCode: code }, select: { id: true } }),
      prisma.eventLoad.findFirst({ where: { qrCode: code }, select: { id: true } })
    ]);
    if (!reservation && !guest && !wristbandReservation && !wristbandGuest && !load) return code;
  }
  throw new Error("No se pudo generar un QR único.");
}

/** Asigna un QR único a cada persona de la reserva que todavía no tenga uno. */
export async function ensureAccessQrCodes(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { guests: { select: { id: true, qrCode: true, wristbandCode: true } } }
  });
  const taken: { primary: string | null; guests: Array<{ id: string; code: string | null }> } = {
    primary: reservation.qrCode ?? reservation.wristbandCode,
    guests: reservation.guests.map((guest) => ({ id: guest.id, code: guest.qrCode ?? guest.wristbandCode }))
  };
  for (const guest of reservation.guests) {
    if (taken.guests.find((item) => item.id === guest.id)?.code) continue;
    const code = await newQrCode();
    const entry = taken.guests.find((item) => item.id === guest.id);
    if (entry) entry.code = code;
    await prisma.reservationGuest.update({ where: { id: guest.id }, data: { qrCode: code } });
  }
  if (!taken.primary) {
    const code = await newQrCode();
    taken.primary = code;
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode: code } });
  }
  return {
    primaryQrCode: taken.primary,
    guests: taken.guests.map((guest) => ({ id: guest.id, qrCode: guest.code }))
  };
}

export function acceptedMessage({ fullName, productName, quantity, totalCents }: { fullName: string; productName: string; quantity: number; totalCents: number }) {
  return [
    `¡Hola ${fullName}! Tu solicitud para Maui Fest ha sido aceptada.`,
    `Realizá la reserva por ${formatMoney(totalCents)} (${quantity} × ${productName}).`,
    process.env.PAYMENT_ALIAS ? `Alias de pago: ${process.env.PAYMENT_ALIAS}.` : null,
    "Adjuntá el comprobante por este medio y aguardá la activación. Cuando la administración verifique el pago, recibirás la confirmación con tu QR de acceso."
  ].filter(Boolean).join(" ");
}

export function paymentConfirmedMessage({ fullName, quantity, event }: { fullName: string; quantity: number; event: EventDetails }) {
  const location = eventLocation(event);
  return `Se aprobó su reserva, ${fullName}. Te esperamos el ${location.day} en ${location.place}. Aclaramos que deberán concurrir con DNI en mano y vestimenta acorde; prohibido ropa deportiva. Son ${quantity} ${quantity === 1 ? "persona" : "personas"}: cada una recibirá su código QR único.`;
}

export function activationMessage({ fullName, codes, event }: { fullName: string; codes: Array<{ fullName: string; qrCode: string }>; event: EventDetails }) {
  const location = eventLocation(event);
  const consumption = event.consumptionItem ? ` La consumición incluida (${event.consumptionItem}) se retira en barra presentando este QR.` : "";
  return `Se aprobó su reserva, ${fullName}. Te esperamos el ${location.day} en ${location.place}. Aclaramos que deberán concurrir con DNI en mano y vestimenta acorde; prohibido ropa deportiva. Presentá este QR en la puerta: puerta lo activa y en barra retirás tu consumición.${consumption} QR únicos de acceso: ${codes.map((person) => `${person.fullName} → ${person.qrCode}`).join(" · ")}.`;
}

/** Aviso al retirar la consumición: el QR deja de mostrarse al cliente. */
export function consumptionDeliveredMessage({ fullName, item, deliveredAt, withTime = true }: { fullName: string; item: string | null; deliveredAt: Date; withTime?: boolean }) {
  const time = new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: ARGENTINA_TIME_ZONE }).format(deliveredAt);
  return `Ya retiró su consumición, ${fullName}${item ? ` (${item})` : ""}${withTime ? ` a las ${time}` : ""}. Tu QR ya no está activo para este evento; si necesitás ayuda, contactá al equipo.`;
}

export function qrImageUrl(qrCode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodeURIComponent(qrCode)}`;
}

type WhatsAppStatus = { sent: boolean; error?: string };

/**
 * Envía el mensaje al WhatsApp del solicitante. Se ejecuta solo en el servidor y no bloquea
 * la respuesta al panel si falla, pero deja registrado el motivo para reenviar a mano.
 */
async function sendWhatsApp(phone: string, text: string): Promise<WhatsAppStatus> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { sent: false, error: "WhatsApp automático no configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)." };
  const digits = phone.replace(/\D/g, "");
  const recipient = digits.length === 10 ? `549${digits}` : digits;
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "text", text: { preview_url: true, body: text } })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, error: `WhatsApp rechazó el mensaje (${response.status}). ${detail.slice(0, 200)}`.trim() };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "No se pudo contactar a WhatsApp." };
  }
}

/** Guarda la notificación de la campanita y, en paralelo, intenta enviarla por WhatsApp. */
export async function notifyReservation(reservationId: string, kind: ReservationNotificationKind, message: string, phone: string) {
  try {
    const whatsapp = await sendWhatsApp(phone, message);
    const notification = await prisma.reservationNotification.create({
      data: { reservationId, kind, message, whatsappSent: whatsapp.sent, whatsappError: whatsapp.error ?? null }
    });
    return { notification: { id: notification.id, kind, message }, whatsapp };
  } catch (error) {
    console.error("Could not store reservation notification", error);
    return { notification: null, whatsapp: { sent: false, error: "No se pudo guardar la notificación." } };
  }
}

/** Enlace de WhatsApp para enviar el mensaje manualmente (respaldo cuando no hay API configurada). */
export function whatsappLink(phone: string, message: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `549${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
