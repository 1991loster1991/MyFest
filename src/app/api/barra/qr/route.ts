import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { barDeliverQrSchema, barScanSchema } from "@/lib/validators";
import { findLoadByDni, findLoadByQr } from "@/lib/event-loads";
import {
  consumptionDeliveredMessage,
  eventDetailsFor,
  notifyReservation,
} from "@/lib/notifications";

function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  })
    .format(date)
    .replace(/([ap])\.\s*m\.?$/i, "$1. m");
}

/** Paso 1 de barra: escanear el QR de la persona para ver su consumición pendiente. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = barScanSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "QR inválido." },
      { status: 400 },
    );
  try {
    const load =
      (await findLoadByQr(parsed.data.qrCode)) ??
      (await findLoadByDni(parsed.data.qrCode));
    if (!load)
      return NextResponse.json(
        { error: "Ese QR no corresponde a ningún cliente registrado." },
        { status: 404 },
      );
    const event = await eventDetailsFor(load.reservation.entryProductName);
    return NextResponse.json({
      load: {
        id: load.id,
        personName: load.personName,
        dni: load.dni,
        qrCode: load.qrCode,
        productName: load.productName,
        eventDate: load.eventDate,
        eventPlace: load.eventPlace,
        consumptionItem: load.consumptionItem ?? event.consumptionItem,
        accessStatus: load.accessStatus,
        admittedAt: load.admittedAt?.toISOString() ?? null,
        deliveredAt: load.deliveredAt?.toISOString() ?? null,
        deactivatedAt: load.deactivatedAt?.toISOString() ?? null,
        deactivatedBy: load.deactivatedBy,
      },
      reservation: {
        id: load.reservation.id,
        fullName: load.reservation.fullName,
        status: load.reservation.status,
        paymentStatus: load.reservation.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Could not scan bar QR", error);
    return NextResponse.json(
      { error: "No se pudo validar el QR." },
      { status: 500 },
    );
  }
}

/** Paso 2 de barra: entregar la consumición (o solo desactivar el QR manualmente). */
export async function PUT(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = barDeliverQrSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  try {
    const load = await findLoadByQr(parsed.data.qrCode);
    if (!load)
      return NextResponse.json(
        { error: "Ese QR no corresponde a ningún cliente registrado." },
        { status: 404 },
      );
    if (load.accessStatus === "DELIVERED") {
      return NextResponse.json(
        {
          error: `La consumición de ${load.personName} ya fue retirada a las ${timeLabel(load.deliveredAt ?? new Date())}.`,
        },
        { status: 409 },
      );
    }
    if (load.accessStatus !== "ADMITTED") {
      return NextResponse.json(
        {
          error:
            "La persona todavía no fue admitida en puerta: el QR no está activo.",
        },
        { status: 409 },
      );
    }
    const now = new Date();
    const event = await eventDetailsFor(load.reservation.entryProductName);
    const item = load.consumptionItem ?? event.consumptionItem;
    await prisma.eventLoad.update({
      where: { id: load.id },
      data: parsed.data.deactivateOnly
        ? { accessStatus: "PENDING", deactivatedAt: now, deactivatedBy: "BAR" }
        : {
            accessStatus: "DELIVERED",
            deliveredAt: now,
            deactivatedAt: now,
            deactivatedBy: "BAR",
          },
    });
    const message = consumptionDeliveredMessage({
      fullName: load.personName,
      item,
      deliveredAt: now,
    });
    await notifyReservation(
      load.reservationId,
      "CONSUMPTION_DELIVERED",
      message,
      load.reservation.phone,
    );
    return NextResponse.json({
      status: parsed.data.deactivateOnly ? "DEACTIVATED" : "DELIVERED",
      personName: load.personName,
      item,
      deliveredAt: now.toISOString(),
      message: parsed.data.deactivateOnly
        ? `QR de ${load.personName} desactivado manualmente a las ${timeLabel(now)}.`
        : `Consumición entregada a ${load.personName} a las ${timeLabel(now)}. Su QR quedó desactivado.`,
    });
  } catch (error) {
    console.error("Could not deliver consumición", error);
    return NextResponse.json(
      { error: "No se pudo registrar la entrega." },
      { status: 500 },
    );
  }
}
