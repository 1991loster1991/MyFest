import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validators";

export async function GET() {
  try {
    const orders = await prisma.barOrder.findMany({
      where: { status: "PENDING", paymentStatus: "PAID" },
      include: { reservation: { select: { fullName: true } } },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(orders.map((order) => ({
      id: order.id,
      reservationId: order.reservationId,
      guestName: order.reservation.fullName,
      itemName: order.itemName,
      quantity: order.quantity,
      status: order.status,
      createdAt: order.createdAt.toISOString()
    })));
  } catch (error) {
    console.error("Could not list bar orders", error);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  try {
    const [primary, companion] = await Promise.all([
      prisma.reservation.findUnique({ where: { dni: parsed.data.dni } }),
      prisma.reservationGuest.findUnique({ where: { dni: parsed.data.dni }, include: { reservation: true } })
    ]);
    const reservation = primary ?? companion?.reservation;
    const attendeeCheckedIn = Boolean(primary?.checkedInAt || companion?.checkedInAt);
    const wristbandCode = primary?.wristbandCode ?? companion?.wristbandCode;
    if (!reservation || reservation.paymentStatus !== "PAID" || !attendeeCheckedIn || !wristbandCode) {
      return NextResponse.json({ error: "No hay un invitado ingresado con pulsera asociada para ese DNI." }, { status: 404 });
    }
    const product = await prisma.catalogProduct.findFirst({
      where: { id: parsed.data.productId, type: "DRINK", active: true }
    });
    if (!product) return NextResponse.json({ error: "Consumición no disponible." }, { status: 404 });
    if (product.priceCents <= 0) return NextResponse.json({ error: "Configurá el precio real antes de vender." }, { status: 409 });
    const order = await prisma.barOrder.create({
      data: {
        reservationId: reservation.id,
        itemName: product.name,
        quantity: parsed.data.quantity,
        unitPriceCents: product.priceCents,
        paymentStatus: "PAID",
        paymentReference: parsed.data.paymentMethod === "CASH" ? "EFECTIVO · barra" : "TRANSFERENCIA VERIFICADA · barra"
      },
      include: { reservation: { select: { fullName: true } } }
    });
    return NextResponse.json({ order: { id: order.id, guestName: order.reservation.fullName } }, { status: 201 });
  } catch (error) {
    console.error("Could not create bar order", error);
    return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  }
}
