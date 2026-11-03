import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = deliverSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  try {
    const result = await prisma.barOrder.updateMany({
      where: { id: parsed.data.orderId, status: "PENDING", paymentStatus: "PAID" },
      data: { status: "DELIVERED", deliveredAt: new Date() }
    });
    if (result.count === 0) return NextResponse.json({ error: "Pedido inexistente o ya entregado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not deliver bar order", error);
    return NextResponse.json({ error: "No se pudo marcar el pedido como entregado." }, { status: 500 });
  }
}
