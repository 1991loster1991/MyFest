import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export class DoorAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function newWristbandCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `MF-${randomUUID().toUpperCase()}`;
    const [reservation, guest] = await Promise.all([
      prisma.reservation.findFirst({ where: { wristbandCode: code }, select: { id: true } }),
      prisma.reservationGuest.findFirst({ where: { wristbandCode: code }, select: { id: true } })
    ]);
    if (!reservation && !guest) return code;
  }
  throw new Error("No se pudo generar un ID de pulsera único.");
}

export async function activateAttendee(reservationId: string, presentedDni: string, suppliedWristbandCode?: string) {
  const dni = presentedDni.replace(/\D/g, "");
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { guests: { select: { fullName: true, dni: true, checkedInAt: true, wristbandCode: true } } }
  });
  if (!reservation) throw new DoorAccessError("No se encontró la reserva.", 404);
  if (!["APPROVED", "ACTIVATED", "CHECKED_IN"].includes(reservation.status) || reservation.paymentStatus !== "PAID") {
    throw new DoorAccessError("La reserva no está aprobada con el pago verificado.", 409);
  }

  const attendee = reservation.dni === dni
    ? { fullName: reservation.fullName, dni: reservation.dni, primary: true, checkedInAt: reservation.checkedInAt, wristbandCode: reservation.wristbandCode }
    : reservation.guests.find((person) => person.dni === dni)
      ? { ...reservation.guests.find((person) => person.dni === dni)!, primary: false }
      : null;
  if (!attendee) throw new DoorAccessError("El DNI no coincide con ninguna persona de esta reserva.", 403);
  if (attendee.checkedInAt || attendee.wristbandCode) {
    const time = attendee.checkedInAt?.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) ?? "hora desconocida";
    throw new DoorAccessError(`Esta persona ya ingresó a las ${time}.`, 409);
  }

  const checkedInAt = new Date();
  const wristbandCode = suppliedWristbandCode ?? await newWristbandCode();
  if (suppliedWristbandCode) {
    const [reservationWithCode, guestWithCode] = await Promise.all([
      prisma.reservation.findFirst({ where: { wristbandCode }, select: { id: true } }),
      prisma.reservationGuest.findFirst({ where: { wristbandCode }, select: { id: true } })
    ]);
    if (reservationWithCode || guestWithCode) throw new DoorAccessError("El ID de pulsera ya está asignado a otra persona.", 409);
  }
  const result = attendee.primary
    ? await prisma.reservation.updateMany({
      where: { id: reservation.id, status: { in: ["APPROVED", "ACTIVATED", "CHECKED_IN"] }, paymentStatus: "PAID", checkedInAt: null, wristbandCode: null },
      data: { checkedInAt, wristbandCode }
    })
    : await prisma.reservationGuest.updateMany({
      where: { reservationId: reservation.id, dni, checkedInAt: null, wristbandCode: null, reservation: { status: { in: ["APPROVED", "ACTIVATED", "CHECKED_IN"] }, paymentStatus: "PAID" } },
      data: { checkedInAt, wristbandCode }
    });
  if (!result.count) throw new DoorAccessError("Esta persona ya ingresó o su pulsera ya fue activada.", 409);

  const statusCheck = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservation.id },
    include: { guests: { select: { checkedInAt: true } } }
  });
  if (statusCheck.checkedInAt && statusCheck.guests.every((person) => person.checkedInAt)) {
    await prisma.reservation.updateMany({ where: { id: reservation.id, status: { in: ["APPROVED", "ACTIVATED"] }, paymentStatus: "PAID" }, data: { status: "CHECKED_IN" } });
  }

  const updated = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservation.id },
    include: { guests: { select: { fullName: true, dni: true, checkedInAt: true, wristbandCode: true } } }
  });
  const activatedAttendee = attendee.primary
    ? { fullName: updated.fullName, dni: updated.dni, wristbandCode: updated.wristbandCode }
    : updated.guests.find((person) => person.dni === dni);
  return {
    reservation: {
      id: updated.id,
      fullName: updated.fullName,
      dni: updated.dni,
      partySize: updated.partySize,
      status: updated.status,
      wristbandCode: updated.wristbandCode,
      checkedInAt: updated.checkedInAt?.toISOString() ?? null,
      guests: updated.guests.map((person) => ({ ...person, checkedInAt: person.checkedInAt?.toISOString() ?? null }))
    },
    activatedAttendee
  };
}
