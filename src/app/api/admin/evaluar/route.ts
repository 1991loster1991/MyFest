import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: parsed.data.reservationId } });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "PENDING") return NextResponse.json({ error: "Solo se pueden evaluar solicitudes pendientes." }, { status: 409 });
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: parsed.data.decision }
    });
    return NextResponse.json({ reservation: updated });
  } catch (error) {
    console.error("Could not evaluate reservation", error);
    return NextResponse.json({ error: "No se pudo actualizar la solicitud." }, { status: 500 });
  }
}
