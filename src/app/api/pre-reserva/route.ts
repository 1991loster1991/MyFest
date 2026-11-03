import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservationSchema } from "@/lib/validators";
import { preReservaGate } from "@/lib/customer-status";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  try {
    // El formulario solo acepta envíos cuando administración habilitó las inscripciones.
    const period = await prisma.eventPeriod.findFirst({ where: { active: true }, orderBy: { startedAt: "desc" } });
    const activeProduct = await prisma.catalogProduct.findFirst({ where: { type: "ENTRY", active: true }, orderBy: { name: "asc" } });
    const gate = preReservaGate({ preReservaOpen: Boolean(period?.preReservaOpen), eventDate: activeProduct?.eventDate ?? null });
    if (!gate.open) return NextResponse.json({ error: gate.reason }, { status: 403 });
    const guestDnis = parsed.data.guests.map((guest) => guest.dni);
    const existingGuest = await prisma.reservation.findFirst({
      where: {
        OR: [
          { dni: { in: [parsed.data.dni, ...guestDnis] } },
          { guests: { some: { dni: { in: [parsed.data.dni, ...guestDnis] } } } }
        ]
      },
      select: { id: true }
    });
    if (existingGuest) {
      return NextResponse.json({ error: "Una de las personas ya tiene una solicitud registrada." }, { status: 409 });
    }
    const product = await prisma.catalogProduct.findFirst({
      where: { id: parsed.data.entryProductId, type: "ENTRY", active: true }
    });
    if (!product) return NextResponse.json({ error: "El tipo de entrada seleccionado ya no está disponible." }, { status: 409 });
    const reservation = await prisma.reservation.create({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        dni: parsed.data.dni,
        birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
        phone: parsed.data.phone,
        partySize: parsed.data.partySize,
        entryProductName: product.name,
        entryPriceCents: product.priceCents,
        notes: parsed.data.notes,
        guests: {
          create: parsed.data.guests.map((guest) => ({
            fullName: guest.fullName,
            dni: guest.dni,
            birthDate: new Date(`${guest.birthDate}T00:00:00.000Z`)
          }))
        }
      }
    });
    return NextResponse.json({ reservation: { id: reservation.id, status: reservation.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una solicitud registrada con ese DNI." }, { status: 409 });
    }
    console.error("Could not create reservation", error);
    return NextResponse.json({ error: "No se pudo guardar la solicitud." }, { status: 500 });
  }
}
