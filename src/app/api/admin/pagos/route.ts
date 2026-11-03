import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentReviewSchema } from "@/lib/validators";
import { ensureAccessQrCodes, eventDetailsFor } from "@/lib/notifications";
import { prepareEventLoads } from "@/lib/event-loads";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = paymentReviewSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisión de pago inválida." },
      { status: 400 },
    );
  try {
    if (parsed.data.reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: {
          id: parsed.data.reservationId,
          status: "APPROVED",
          paymentStatus: "SUBMITTED",
        },
      });
      if (!reservation)
        return NextResponse.json(
          { error: "Pago inexistente o ya revisado." },
          { status: 409 },
        );

      if (parsed.data.decision === "REJECTED") {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { paymentStatus: "REJECTED" },
        });
        return NextResponse.json({ ok: true, paymentStatus: "REJECTED" });
      }

      // Con el pago verificado se emite un QR único por persona. La reserva NO se activa:
      // la habilitación final la decide administración con los botones Activar / Desactivar.
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { paymentStatus: "PAID", paymentConfirmedAt: new Date() },
      });
      const codes = await ensureAccessQrCodes(reservation.id);
      const event = await eventDetailsFor(reservation.entryProductName);
      await prepareEventLoads(reservation.id, event);
      return NextResponse.json({
        ok: true,
        paymentStatus: "PAID",
        reservation: updated,
        qrCodes: codes,
      });
    } else if (parsed.data.orderId) {
      const result = await prisma.barOrder.updateMany({
        where: { id: parsed.data.orderId, paymentStatus: "SUBMITTED" },
        data: { paymentStatus: parsed.data.decision },
      });
      if (!result.count)
        return NextResponse.json(
          { error: "Pago inexistente o ya revisado." },
          { status: 409 },
        );
    }
    return NextResponse.json({ ok: true, paymentStatus: parsed.data.decision });
  } catch (error) {
    console.error("Could not review payment", error);
    return NextResponse.json(
      { error: "No se pudo revisar el pago." },
      { status: 500 },
    );
  }
}
