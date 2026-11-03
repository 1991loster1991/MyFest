import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wristbandSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = wristbandSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos de pulsera inválidos." }, { status: 400 });
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: parsed.data.reservationId } });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "CHECKED_IN") return NextResponse.json({ error: "Primero registrá el ingreso del invitado." }, { status: 409 });
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { wristbandCode: parsed.data.wristbandCode }
    });
    return NextResponse.json({ reservation: updated });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Esa pulsera ya está asociada a otra reserva." }, { status: 409 });
    }
    console.error("Could not link wristband", error);
    return NextResponse.json({ error: "No se pudo asociar la pulsera." }, { status: 500 });
  }
}
