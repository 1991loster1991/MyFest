import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { doorScanSchema } from "@/lib/validators";
import { findLoadByDni, findLoadByQr } from "@/lib/event-loads";

const REASON_LABELS: Record<string, string> = {
  MISSING_ID: "Sin DNI",
  DRESS_CODE: "Vestimenta no acorde",
  SAFETY_CONCERN: "Seguridad",
  CONDUCT: "Conducta",
  CAPACITY_REACHED: "Aforo completo",
  OTHER_OBJECTIVE_REASON: "Otro motivo",
  NOT_ON_LIST: "No figura en la lista",
  PAYMENT_UNVERIFIED: "Pago no verificado",
};

/** Paso 1 de puerta: escanear el QR de la persona y mostrar sus datos antes de decidir. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = doorScanSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "QR inválido." },
      { status: 400 },
    );
  try {
    const load =
      (await findLoadByQr(parsed.data.qrCode)) ??
      (await findLoadByDni(parsed.data.qrCode));
    if (!load) {
      return NextResponse.json(
        { error: "Ese QR no corresponde a ningún cliente registrado." },
        { status: 404 },
      );
    }
    const event = await prisma.catalogProduct.findFirst({
      where: { type: "ENTRY", name: load.reservation.entryProductName },
      select: { eventDate: true, eventPlace: true, includedItem: true },
    });
    const matchesCurrentEvent =
      Boolean(event) &&
      (event!.eventDate ?? null) === load.eventDate &&
      (event!.eventPlace ?? null) === load.eventPlace;
    // "Evento pendiente": el QR pertenece al evento cargado en el catálogo y todavía no fue
    // consumido, así que en la puerta se ofrece Activar.
    const pendingEvent =
      matchesCurrentEvent &&
      load.accessStatus !== "DELIVERED" &&
      load.accessStatus !== "ADMITTED" &&
      !load.deactivatedAt;
    // La consumición se puede retirar en barra solo mientras el QR siga vigente.
    const consumptionAvailable = load.accessStatus === "ADMITTED" && !load.deliveredAt && !load.deactivatedAt;
    return NextResponse.json({
      load: {
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
      },
      reservation: {
        id: load.reservation.id,
        fullName: load.reservation.fullName,
        partySize: load.reservation.partySize,
        status: load.reservation.status,
        paymentStatus: load.reservation.paymentStatus,
        entryProductName: load.reservation.entryProductName,
        checkedInAt: load.reservation.checkedInAt?.toISOString() ?? null,
      },
      isPrimary: load.guestId === null,
      matchesCurrentEvent,
      pendingEvent,
      consumptionAvailable,
      reasonLabels: REASON_LABELS,
    });
  } catch (error) {
    console.error("Could not scan door QR", error);
    return NextResponse.json(
      { error: "No se pudo validar el QR." },
      { status: 500 },
    );
  }
}
