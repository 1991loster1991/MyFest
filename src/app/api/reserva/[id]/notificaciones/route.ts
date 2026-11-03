import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentEventLoads } from "@/lib/event-loads";
import {
  eventDetailsFor,
  eventLocation,
  qrImageUrl,
} from "@/lib/notifications";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        status: true,
        entryProductName: true,
        qrCode: true,
        notifications: {
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, message: true, createdAt: true },
        },
      },
    });
    if (!reservation)
      return NextResponse.json(
        { error: "No se encontró la solicitud." },
        { status: 404 },
      );
    const event = await eventDetailsFor(reservation.entryProductName);
    const loads = await currentEventLoads(reservation.id);
    // El QR solo se muestra mientras esté vigente: oculto si se retiró la consumición o se desactivó.
    const activeLoad = loads.find((load) => !load.deactivatedAt && load.accessStatus !== "DELIVERED") ?? null;
    const qrCode = activeLoad?.qrCode ?? reservation.qrCode;
    return NextResponse.json({
      reservation: {
        id: reservation.id,
        status: reservation.status,
        fullName: reservation.fullName,
      },
      notifications: reservation.notifications.map((notification) => ({
        id: notification.id,
        kind: notification.kind,
        message: notification.message,
        createdAt: notification.createdAt.toISOString(),
      })),
      event: eventLocation(event),
      loads: loads.map((load) => ({
        id: load.id,
        personName: load.personName,
        accessStatus: load.accessStatus,
        consumptionItem: load.consumptionItem ?? event.consumptionItem,
        admittedAt: load.admittedAt?.toISOString() ?? null,
        deliveredAt: load.deliveredAt?.toISOString() ?? null,
        deactivatedAt: load.deactivatedAt?.toISOString() ?? null,
      })),
      qr: qrCode && activeLoad
        ? { code: qrCode, imageUrl: qrImageUrl(qrCode) }
        : null,
    });
  } catch (error) {
    console.error("Could not retrieve reservation notifications", error);
    return NextResponse.json(
      { error: "No se pudieron consultar las notificaciones." },
      { status: 500 },
    );
  }
}
