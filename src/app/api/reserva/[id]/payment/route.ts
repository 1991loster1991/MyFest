import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function formatAmount(cents: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents / 100);
}

/**
 * El cliente adjunta el comprobante (opcionalmente con una referencia) y queda registrado
 * en el panel de eventos, además de enviarse automáticamente al correo configurado.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "No se recibió el comprobante." }, { status: 400 });

    const reference = String(formData.get("paymentReference") ?? "").trim().slice(0, 100);
    const file = formData.get("receipt");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Adjuntá una imagen o PDF del comprobante." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "El comprobante supera los 4 MB. Comprimí la imagen o subí un PDF más liviano." }, { status: 413 });
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no admitido. Usá JPG, PNG, WEBP o PDF." }, { status: 415 });
    }

    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "APPROVED" && reservation.status !== "PENDING") {
      return NextResponse.json({ error: "Esta solicitud no admite pagos en este momento." }, { status: 409 });
    }
    if (reservation.entryPriceCents <= 0) {
      return NextResponse.json({ error: "El precio de la entrada todavía no está configurado." }, { status: 409 });
    }
    if (reservation.paymentStatus === "PAID") {
      return NextResponse.json({ error: "El pago ya fue confirmado." }, { status: 409 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    const fileName = file.name || `comprobante-${reservation.id}`;
    const total = reservation.entryPriceCents * reservation.partySize;

    const updated = await prisma.reservation.update({
      where: { id },
      data: { paymentStatus: "SUBMITTED", paymentReference: reference || fileName }
    });

    // Registro visible en el panel de eventos.
    const notification = await prisma.reservationNotification.create({
      data: {
        reservationId: id,
        kind: "PAYMENT_RECEIPT",
        message: `Comprobante recibido de ${reservation.fullName} (${formatAmount(total)}${reference ? ` · Ref. ${reference}` : ""}). Queda pendiente de verificación.`,
        attachmentUrl: dataUrl,
        attachmentName: fileName
      }
    });

    // Envío automático al correo del evento.
    const { sendPaymentEmail } = await import("@/lib/notifications");
    const email = await sendPaymentEmail({
      subject: `Comprobante de pago · ${reservation.fullName} · ${formatAmount(total)}`,
      text: [
        `Nuevo comprobante de pago para Maui Fest.`,
        ``,
        `Reserva: ${reservation.id}`,
        `Titular: ${reservation.fullName}`,
        `DNI: ${reservation.dni}`,
        `Teléfono: ${reservation.phone}`,
        `Email: ${reservation.email || "sin dato"}`,
        `Personas: ${reservation.partySize}`,
        `Entrada: ${reservation.entryProductName}`,
        `Total: ${formatAmount(total)}`,
        reference ? `Referencia informada: ${reference}` : ``,
        ``,
        `Verificá el pago en el panel del evento para aprobar la reserva.`
      ].filter((line) => line !== "").join("\n"),
      attachment: { filename: fileName, contentBase64: buffer.toString("base64"), contentType: file.type || "application/octet-stream" }
    });

    if (email.sent) {
      await prisma.reservationNotification.update({ where: { id: notification.id }, data: { emailSent: true } });
    } else {
      await prisma.reservationNotification.update({ where: { id: notification.id }, data: { emailError: email.error ?? null } });
    }

    return NextResponse.json({
      reservation: { id: updated.id, paymentStatus: updated.paymentStatus },
      email,
      message: email.sent
        ? "Comprobante enviado. El equipo lo verificará y te avisaremos cuando tu reserva quede aprobada."
        : "Comprobante registrado en el panel del evento. El equipo lo verificará a la brevedad."
    });
  } catch (error) {
    console.error("Could not submit reservation receipt", error);
    return NextResponse.json({ error: "No se pudo registrar el comprobante." }, { status: 500 });
  }
}
