import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkinSchema } from "@/lib/validators";
import { activateAttendee, DoorAccessError } from "@/lib/door-access";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Código de reserva inválido." },
      { status: 400 },
    );
  const dni = parsed.data.dni?.replace(/\D/g, "");
  try {
    const reservation = parsed.data.reservationId
      ? await prisma.reservation.findUnique({
          where: { id: parsed.data.reservationId },
          include: {
            guests: {
              select: {
                fullName: true,
                dni: true,
                qrCode: true,
                checkedInAt: true,
                wristbandCode: true,
              },
            },
          },
        })
      : await findReservationByScan(parsed.data.dni ?? "");
    if (!reservation)
      return NextResponse.json(
        { error: "No se encontró la reserva." },
        { status: 404 },
      );
    if (!["APPROVED", "ACTIVATED", "CHECKED_IN"].includes(reservation.status)) {
      return NextResponse.json(
        {
          error:
            reservation.status === "PENDING"
              ? "La solicitud todavía no fue aceptada."
              : "La reserva no está activada para ingresar.",
        },
        { status: 409 },
      );
    }
    if (reservation.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "El pago de la entrada todavía no está verificado." },
        { status: 409 },
      );
    }
    if (!parsed.data.confirm)
      return NextResponse.json({ reservation: doorGuest(reservation) });
    // El QR único identifica a una persona: si coincide con el de un acompañante, se activa esa persona.
    const targetDni =
      (dniForReservation(reservation, parsed.data.dni ?? "")) ?? dni;
    if (!targetDni)
      return NextResponse.json(
        {
          error:
            "Ingresá el DNI o escaneá el QR que presenta la persona para activar su pulsera.",
        },
        { status: 400 },
      );
    const result = await activateAttendee(reservation.id, targetDni);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DoorAccessError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Could not check in reservation", error);
    return NextResponse.json(
      { error: "No se pudo registrar el ingreso." },
      { status: 500 },
    );
  }
}

/** Busca por DNI, DNI de acompañante o por el QR único de acceso. */
async function findReservationByScan(value: string) {
  const include = {
    guests: {
      select: {
        fullName: true,
        dni: true,
        qrCode: true,
        checkedInAt: true,
        wristbandCode: true,
      },
    },
  };
  const byDni = value.replace(/\D/g, "");
  if (byDni.length >= 6) {
    const found = await prisma.reservation.findFirst({
      where: { OR: [{ dni: byDni }, { guests: { some: { dni: byDni } } }] },
      include,
    });
    if (found) return found;
  }
  return prisma.reservation.findFirst({
    where: {
      OR: [
        { qrCode: value.trim() },
        { guests: { some: { qrCode: value.trim() } } },
      ],
    },
    include,
  });
}

/** DNI de la persona a la que pertenece el QR escaneado (o null si se escaneó un DNI). */
function dniForReservation(
  reservation: {
    fullName: string;
    dni: string;
    qrCode: string | null;
    guests: Array<{ fullName: string; dni: string; qrCode: string | null }>;
  },
  value: string,
) {
  const scanned = value.trim();
  if (!scanned) return null;
  if (/^\d+$/.test(scanned)) return null;
  if (reservation.qrCode === scanned) return reservation.dni;
  return (
    reservation.guests.find((guest) => guest.qrCode === scanned)?.dni ?? null
  );
}

function doorGuest(reservation: {
  id: string;
  fullName: string;
  dni: string;
  partySize: number;
  status: string;
  wristbandCode: string | null;
  checkedInAt: Date | null;
  guests: Array<{
    fullName: string;
    dni: string;
    checkedInAt: Date | null;
    wristbandCode: string | null;
  }>;
}) {
  return {
    id: reservation.id,
    fullName: reservation.fullName,
    dni: reservation.dni,
    partySize: reservation.partySize,
    status: reservation.status,
    wristbandCode: reservation.wristbandCode,
    checkedInAt: reservation.checkedInAt?.toISOString() ?? null,
    guests: reservation.guests.map((person) => ({
      ...person,
      checkedInAt: person.checkedInAt?.toISOString() ?? null,
    })),
  };
}
