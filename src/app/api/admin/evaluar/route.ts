import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateSchema } from "@/lib/validators";
import { acceptedMessage, notifyReservation } from "@/lib/notifications";

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
    if (parsed.data.decision !== "APPROVED") return NextResponse.json({ reservation: updated });

    // Al aprobarse se informa el total según la entrada elegida; el comprobante se adjunta
    // por WhatsApp y el acceso queda pendiente hasta que administración lo active.
    const message = acceptedMessage({
      fullName: updated.fullName,
      productName: updated.entryProductName,
      quantity: updated.partySize,
      totalCents: updated.entryPriceCents * updated.partySize
    });
    const delivery = await notifyReservation(updated.id, "ACCEPTED", message, updated.phone);
    return NextResponse.json({ reservation: updated, notification: delivery.notification, whatsapp: delivery.whatsapp, message });
  } catch (error) {
    console.error("Could not evaluate reservation", error);
    return NextResponse.json({ error: "No se pudo actualizar la solicitud." }, { status: 500 });
  }
}
