import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { drinkOrderSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = drinkOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Pedido inválido." }, { status: 400 });
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) return NextResponse.json({ error: "No se encontró la reserva." }, { status: 404 });
    if (reservation.status !== "APPROVED" || reservation.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "La entrada debe estar aprobada y pagada para comprar consumiciones." }, { status: 409 });
    }
    if (!process.env.PAYMENT_ALIAS) return NextResponse.json({ error: "El alias de pago todavía no está configurado." }, { status: 503 });
    const product = await prisma.catalogProduct.findFirst({
      where: { id: parsed.data.productId, type: "DRINK", active: true }
    });
    if (!product) return NextResponse.json({ error: "La consumición seleccionada ya no está disponible." }, { status: 404 });
    if (product.priceCents <= 0) return NextResponse.json({ error: "El precio demo debe configurarse antes de recibir pagos." }, { status: 409 });
    const order = await prisma.barOrder.create({
      data: {
        reservationId: reservation.id,
        itemName: product.name,
        quantity: parsed.data.quantity,
        unitPriceCents: product.priceCents,
        paymentStatus: "SUBMITTED",
        paymentReference: parsed.data.paymentReference
      }
    });
    return NextResponse.json({ order: { id: order.id, paymentStatus: order.paymentStatus } }, { status: 201 });
  } catch (error) {
    console.error("Could not submit drink order", error);
    return NextResponse.json({ error: "No se pudo enviar el pedido." }, { status: 500 });
  }
}
