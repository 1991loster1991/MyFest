import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSubmissionSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = paymentSubmissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Referencia inválida." }, { status: 400 });
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "APPROVED") return NextResponse.json({ error: "La reserva debe estar aprobada antes de informar el pago." }, { status: 409 });
    if (reservation.entryPriceCents <= 0) return NextResponse.json({ error: "El precio demo debe configurarse antes de recibir pagos." }, { status: 409 });
    if (!process.env.PAYMENT_ALIAS) return NextResponse.json({ error: "El alias de pago todavía no está configurado." }, { status: 503 });
    if (reservation.paymentStatus === "PAID") return NextResponse.json({ error: "El pago ya fue confirmado." }, { status: 409 });
    const updated = await prisma.reservation.update({
      where: { id },
      data: { paymentStatus: "SUBMITTED", paymentReference: parsed.data.paymentReference }
    });
    return NextResponse.json({ reservation: { id: updated.id, paymentStatus: updated.paymentStatus } });
  } catch (error) {
    console.error("Could not submit reservation payment", error);
    return NextResponse.json({ error: "No se pudo registrar la referencia de pago." }, { status: 500 });
  }
}
