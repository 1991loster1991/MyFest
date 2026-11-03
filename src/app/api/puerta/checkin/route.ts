import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkinSchema } from "@/lib/validators";
import { activateAttendee, DoorAccessError } from "@/lib/door-access";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Código de reserva inválido." }, { status: 400 });
  const dni = parsed.data.dni?.replace(/\D/g, "");
  try {
    const reservation = parsed.data.reservationId
      ? await prisma.reservation.findUnique({ where: { id: parsed.data.reservationId }, include: { guests: { select: { fullName: true, dni: true, checkedInAt: true, wristbandCode: true } } } })
      : await prisma.reservation.findFirst({
        where: { OR: [{ dni: dni ?? "" }, { guests: { some: { dni: dni ?? "" } } }] },
        include: { guests: { select: { fullName: true, dni: true, checkedInAt: true, wristbandCode: true } } }
      });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "APPROVED" && reservation.status !== "CHECKED_IN") {
      return NextResponse.json({ error: "La reserva no está aprobada para ingresar." }, { status: 409 });
    }
    if (reservation.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "El pago de la entrada todavía no está verificado." }, { status: 409 });
    }
    if (!parsed.data.confirm) return NextResponse.json({ reservation: doorGuest(reservation) });
    if (!dni) return NextResponse.json({ error: "Ingresá el DNI que presenta la persona para activar su pulsera." }, { status: 400 });
    const result = await activateAttendee(reservation.id, dni);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DoorAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not check in reservation", error);
    return NextResponse.json({ error: "No se pudo registrar el ingreso." }, { status: 500 });
  }
}

function doorGuest(reservation: {
  id: string;
  fullName: string;
  dni: string;
  partySize: number;
  status: string;
  wristbandCode: string | null;
  checkedInAt: Date | null;
  guests: Array<{ fullName: string; dni: string; checkedInAt: Date | null; wristbandCode: string | null }>;
}) {
  return {
    id: reservation.id,
    fullName: reservation.fullName,
    dni: reservation.dni,
    partySize: reservation.partySize,
    status: reservation.status,
    wristbandCode: reservation.wristbandCode,
    checkedInAt: reservation.checkedInAt?.toISOString() ?? null,
    guests: reservation.guests.map((person) => ({ ...person, checkedInAt: person.checkedInAt?.toISOString() ?? null }))
  };
}
