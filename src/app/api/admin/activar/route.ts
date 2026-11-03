import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activationStatusSchema } from "@/lib/validators";
import {
  activationMessage,
  ensureAccessQrCodes,
  eventDetailsFor,
  notifyReservation,
} from "@/lib/notifications";
import { prepareEventLoads } from "@/lib/event-loads";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = activationStatusSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Acción de activación inválida." },
      { status: 400 },
    );
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: parsed.data.reservationId },
      include: {
        guests: {
          orderBy: { createdAt: "asc" },
          select: { id: true, fullName: true, qrCode: true },
        },
      },
    });
    if (!reservation)
      return NextResponse.json(
        { error: "No se encontró la reserva." },
        { status: 404 },
      );
    if (reservation.status === "REJECTED" || reservation.status === "PENDING") {
      return NextResponse.json(
        { error: "La solicitud debe estar aprobada antes de activarse." },
        { status: 409 },
      );
    }
    if (reservation.paymentStatus !== "PAID") {
      return NextResponse.json(
        {
          error:
            "El comprobante todavía no fue verificado. Confirmá el pago antes de activar.",
        },
        { status: 409 },
      );
    }

    if (!parsed.data.active) {
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status:
            reservation.status === "CHECKED_IN" ? "CHECKED_IN" : "APPROVED",
          activatedAt: null,
        },
      });
      return NextResponse.json({ reservation: updated, whatsapp: null });
    }

    // Activar emite el QR único que ya se generó al confirmar el pago y avisa al cliente.
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status:
          reservation.status === "CHECKED_IN" ? "CHECKED_IN" : "ACTIVATED",
        activatedAt: reservation.activatedAt ?? new Date(),
      },
    });
    const codes = await ensureAccessQrCodes(reservation.id);
    const event = await eventDetailsFor(reservation.entryProductName);
    // La carga del evento vincula el QR permanente con la consumición que se retira en barra.
    await prepareEventLoads(reservation.id, event);
    const people = [
      { fullName: reservation.fullName, qrCode: codes.primaryQrCode },
      ...reservation.guests.map((guest) => ({
        fullName: guest.fullName,
        qrCode: codes.guests.find((item) => item.id === guest.id)?.qrCode ?? "",
      })),
    ].filter((person) => Boolean(person.qrCode));
    const message = activationMessage({
      fullName: reservation.fullName,
      codes: people,
      event,
    });
    const delivery = await notifyReservation(
      reservation.id,
      "ACTIVATED",
      message,
      reservation.phone,
    );
    return NextResponse.json({
      reservation: updated,
      qrCodes: codes,
      people,
      message,
      notification: delivery.notification,
      whatsapp: delivery.whatsapp,
    });
  } catch (error) {
    console.error("Could not update reservation activation", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la activación." },
      { status: 500 },
    );
  }
}
