import { prisma } from "@/lib/prisma";
import { newQrCode } from "@/lib/notifications";

export type EventLoadView = {
  id: string;
  personName: string;
  dni: string;
  qrCode: string;
  productName: string;
  eventDate: string | null;
  eventPlace: string | null;
  consumptionItem: string | null;
  accessStatus: string;
  rejectionReason: string | null;
  admittedAt: string | null;
  deliveredAt: string | null;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
};

export function eventLoadView(load: {
  id: string;
  personName: string;
  dni: string;
  qrCode: string;
  productName: string;
  eventDate: string | null;
  eventPlace: string | null;
  consumptionItem: string | null;
  accessStatus: string;
  rejectionReason: string | null;
  admittedAt: Date | null;
  deliveredAt: Date | null;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
}): EventLoadView {
  return {
    id: load.id,
    personName: load.personName,
    dni: load.dni,
    qrCode: load.qrCode,
    productName: load.productName,
    eventDate: load.eventDate,
    eventPlace: load.eventPlace,
    consumptionItem: load.consumptionItem,
    accessStatus: load.accessStatus,
    rejectionReason: load.rejectionReason,
    admittedAt: load.admittedAt?.toISOString() ?? null,
    deliveredAt: load.deliveredAt?.toISOString() ?? null,
    deactivatedAt: load.deactivatedAt?.toISOString() ?? null,
    deactivatedBy: load.deactivatedBy
  };
}

/** Marca de "formato" del evento: la reserva solo está habilitada si su evento coincide con el activo. */
export function eventStamp(eventDate: string | null, eventPlace: string | null) {
  return `${eventDate ?? ""}|${eventPlace ?? ""}`;
}

/** Cargas de la reserva para el evento activo: excluye las del evento anterior ya completadas. */
export async function currentEventLoads(reservationId: string) {
  const loads = await prisma.eventLoad.findMany({
    where: { reservationId },
    orderBy: [{ createdAt: "asc" }]
  });
  if (!loads.length) return [];
  const active = await prisma.eventPeriod.findFirst({ where: { active: true }, orderBy: { startedAt: "desc" } });
  const relevant = active ? loads.filter((load) => load.createdAt >= active.startedAt) : loads;
  return relevant.length ? relevant : loads.slice(-1);
}

export async function findLoadByQr(qrCode: string) {
  const code = qrCode.trim();
  if (!code) return null;
  return prisma.eventLoad.findFirst({
    where: { OR: [{ qrCode: code }, { qrCode: { equals: code, mode: "insensitive" } }] },
    include: { reservation: true }
  });
}

export async function findLoadByDni(dni: string) {
  const normalized = dni.replace(/\D/g, "");
  if (normalized.length < 6) return null;
  return prisma.eventLoad.findFirst({
    where: { dni: normalized },
    orderBy: { createdAt: "desc" },
    include: { reservation: true }
  });
}

/**
 * Crea la carga del evento para cada persona de la reserva y persiste el QR único que la
 * identifica para siempre (también para los próximos eventos).
 */
export async function prepareEventLoads(reservationId: string, event: { productName: string; eventDate: string | null; eventPlace: string | null; consumptionItem: string | null }) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { guests: { orderBy: { createdAt: "asc" }, select: { id: true, fullName: true, dni: true, qrCode: true, wristbandCode: true } } }
  });
  const existing = await prisma.eventLoad.findMany({ where: { reservationId }, select: { id: true, guestId: true } });

  if (!reservation.qrCode) {
    const code = reservation.wristbandCode ?? await newQrCode();
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode: code } });
    reservation.qrCode = code;
  }

  const people = [
    { guestId: null, personName: reservation.fullName, dni: reservation.dni, qrCode: reservation.qrCode },
    ...(await Promise.all(reservation.guests.map(async (guest) => {
      const current = guest.qrCode ?? guest.wristbandCode;
      if (!current) {
        const code = await newQrCode();
        await prisma.reservationGuest.update({ where: { id: guest.id }, data: { qrCode: code } });
        return { guestId: guest.id, personName: guest.fullName, dni: guest.dni, qrCode: code };
      }
      if (!guest.qrCode) await prisma.reservationGuest.update({ where: { id: guest.id }, data: { qrCode: current } });
      return { guestId: guest.id, personName: guest.fullName, dni: guest.dni, qrCode: current };
    })))
  ];

  const loads = [];
  for (const person of people) {
    const already = existing.find((load) => load.guestId === person.guestId);
    if (already) {
      loads.push(await prisma.eventLoad.update({
        where: { id: already.id },
        data: { qrCode: person.qrCode, productName: event.productName, eventDate: event.eventDate, eventPlace: event.eventPlace, consumptionItem: event.consumptionItem }
      }));
      continue;
    }
    loads.push(await prisma.eventLoad.create({
      data: {
        reservationId,
        guestId: person.guestId,
        personName: person.personName,
        dni: person.dni,
        qrCode: person.qrCode,
        productName: event.productName,
        eventDate: event.eventDate,
        eventPlace: event.eventPlace,
        consumptionItem: event.consumptionItem
      }
    }));
  }
  return loads;
}
