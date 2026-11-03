import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Configuración pública de inscripciones: decide si el formulario de pre-reserva está abierto. */
export async function GET() {
  try {
    const period = await prisma.eventPeriod.findFirst({
      where: { active: true },
      orderBy: { startedAt: "desc" },
    });
    const product = await prisma.catalogProduct.findFirst({
      where: { type: "ENTRY", active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      open: Boolean(period?.preReservaOpen),
      eventDate: product?.eventDate ?? null,
    });
  } catch (error) {
    console.error("Could not load pre-reservation settings", error);
    return NextResponse.json({ open: false, eventDate: null });
  }
}
