import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashierSaleSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = cashierSaleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos de venta inválidos." }, { status: 400 });
  try {
    const product = await prisma.catalogProduct.findFirst({
      where: { id: parsed.data.entryProductId, type: "ENTRY", active: true }
    });
    if (!product) return NextResponse.json({ error: "Tipo de entrada no disponible." }, { status: 404 });
    if (product.priceCents <= 0) return NextResponse.json({ error: "Configurá el precio real en el catálogo antes de vender." }, { status: 409 });
    const reservation = await prisma.reservation.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        dni: parsed.data.dni,
        birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
        phone: parsed.data.phone,
        partySize: parsed.data.partySize,
        status: "APPROVED",
        paymentStatus: "PAID",
        paymentReference: parsed.data.paymentMethod === "CASH" ? "EFECTIVO · caja" : "TRANSFERENCIA · caja",
        entryProductName: product.name,
        entryPriceCents: product.priceCents
      }
    });
    return NextResponse.json({
      ticket: {
        id: reservation.id,
        fullName: reservation.fullName,
        partySize: reservation.partySize,
        productName: reservation.entryProductName,
        totalCents: reservation.entryPriceCents * reservation.partySize
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una reserva con ese DNI. Buscala en puerta antes de emitir otra." }, { status: 409 });
    }
    console.error("Could not register walk-in sale", error);
    return NextResponse.json({ error: "No se pudo registrar la venta." }, { status: 500 });
  }
}
