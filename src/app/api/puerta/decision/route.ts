import { NextResponse } from "next/server";
import type { AdmissionIncidentReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { doorDecisionSchema } from "@/lib/validators";
import { findLoadByQr } from "@/lib/event-loads";
import { newWristbandCode } from "@/lib/door-access";

const REASON_LABELS: Record<string, string> = {
  MISSING_ID: "Sin DNI",
  DRESS_CODE: "Vestimenta no acorde",
  SAFETY_CONCERN: "Seguridad",
  CONDUCT: "Conducta",
  CAPACITY_REACHED: "Aforo completo",
  OTHER_OBJECTIVE_REASON: "Otro motivo",
  NOT_ON_LIST: "No figura en la lista",
  PAYMENT_UNVERIFIED: "Pago no verificado"
};

const INCIDENT_REASONS: AdmissionIncidentReason[] = ["CAPACITY_REACHED", "MISSING_ID", "DRESS_CODE", "SAFETY_CONCERN", "CONDUCT", "OTHER_OBJECTIVE_REASON"];

/** Hora exacta sin el punto final de la abreviatura ("10:59 a. m."). */
function timeLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(date).replace(/([ap])\.\s*m\.?$/i, "$1. m");
}

/** Los códigos propios del escaneo se traducen a los motivos de incidencia permitidos. */
function incidentReason(code: string | undefined): AdmissionIncidentReason {
  return INCIDENT_REASONS.find((reason) => reason === code) ?? "OTHER_OBJECTIVE_REASON";
}

/** Paso 2 de puerta: el operador elige Activar o Rechazar (con una explicación breve). */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = doorDecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Decisión inválida." }, { status: 400 });
  const cookieHeader = request.headers.get("cookie") ?? "";
  const operatorRole = cookieHeader.match(/(?:^|;\s*)mauifest_role=([^;]*)/)?.[1] ?? "DOOR";
  try {
    const load = await findLoadByQr(parsed.data.qrCode);
    if (!load) return NextResponse.json({ error: "Ese QR no corresponde a ningún cliente registrado." }, { status: 404 });
    const reservation = load.reservation;

    if (parsed.data.decision === "REJECT") {
      const reason = parsed.data.reason?.trim() || REASON_LABELS[parsed.data.reasonCode ?? ""] || "Rechazado en puerta";
      await prisma.$transaction([
        prisma.eventLoad.update({ where: { id: load.id }, data: { accessStatus: "REJECTED", rejectionReason: reason } }),
        prisma.admissionIncident.create({
          data: {
            reservationId: reservation.id,
            reason: incidentReason(parsed.data.reasonCode),
            details: `${load.personName} (DNI ${load.dni}): ${reason}`,
            operatorRole
          }
        })
      ]);
      return NextResponse.json({
        decision: "REJECTED",
        personName: load.personName,
        reason,
        message: `Ingreso rechazado para ${load.personName}. Motivo registrado: ${reason}.`
      });
    }

    if (reservation.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "El pago no está verificado: no se puede activar el QR." }, { status: 409 });
    }
    if (reservation.status === "REJECTED" || reservation.status === "PENDING") {
      return NextResponse.json({ error: "La solicitud todavía no fue aceptada por administración." }, { status: 409 });
    }
    if (load.accessStatus === "DELIVERED" || load.deactivatedAt) {
      return NextResponse.json({ error: "Esta carga ya fue cerrada: la consumición se retiró o el QR fue desactivado." }, { status: 409 });
    }
    if (load.accessStatus === "ADMITTED") {
      const time = load.admittedAt
        ? new Intl.DateTimeFormat("es-AR", { timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(load.admittedAt)
        : "anteriormente";
      return NextResponse.json({ error: `${load.personName} ya fue admitido a las ${time}.` }, { status: 409 });
    }

    const now = new Date();
    const wristbandCode = await newWristbandCode();
    await prisma.eventLoad.update({
      where: { id: load.id },
      data: { accessStatus: "ADMITTED", admittedAt: now, rejectionReason: null }
    });
    if (load.guestId) {
      await prisma.reservationGuest.updateMany({ where: { id: load.guestId, checkedInAt: null }, data: { checkedInAt: now, wristbandCode } });
    } else {
      await prisma.reservation.updateMany({
        where: { id: reservation.id, checkedInAt: null },
        data: { checkedInAt: now, wristbandCode, ...(reservation.status === "ACTIVATED" ? { status: "CHECKED_IN" } : {}) }
      });
    }

    // Si todas las personas ya ingresaron, la reserva pasa a "Ingresó".
    const people = await prisma.eventLoad.findMany({ where: { reservationId: reservation.id }, select: { accessStatus: true } });
    if (people.length && people.every((person) => person.accessStatus === "ADMITTED" || person.accessStatus === "DELIVERED")) {
      await prisma.reservation.updateMany({ where: { id: reservation.id, status: { in: ["APPROVED", "ACTIVATED"] } }, data: { status: "CHECKED_IN" } });
    }

    const time = timeLabel(now);
    return NextResponse.json({
      decision: "ACTIVATED",
      personName: load.personName,
      wristbandCode,
      admittedAt: now.toISOString(),
      consumptionItem: load.consumptionItem,
      message: `${load.personName} admitido a las ${time}. QR activado: ya puede retirar su consumición en barra.`
    });
  } catch (error) {
    console.error("Could not apply door decision", error);
    return NextResponse.json({ error: "No se pudo registrar la decisión en puerta." }, { status: 500 });
  }
}
