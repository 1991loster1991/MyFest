import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentReviewSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = paymentReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revisión de pago inválida." }, { status: 400 });
  try {
    if (parsed.data.reservationId) {
      const result = await prisma.reservation.updateMany({
        where: { id: parsed.data.reservationId, status: "APPROVED", paymentStatus: "SUBMITTED" },
        data: { paymentStatus: parsed.data.decision }
      });
      if (!result.count) return NextResponse.json({ error: "Pago inexistente o ya revisado." }, { status: 409 });
    } else if (parsed.data.orderId) {
      const result = await prisma.barOrder.updateMany({
        where: { id: parsed.data.orderId, paymentStatus: "SUBMITTED" },
        data: { paymentStatus: parsed.data.decision }
      });
      if (!result.count) return NextResponse.json({ error: "Pago inexistente o ya revisado." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, paymentStatus: parsed.data.decision });
  } catch (error) {
    console.error("Could not review payment", error);
    return NextResponse.json({ error: "No se pudo revisar el pago." }, { status: 500 });
  }
}
