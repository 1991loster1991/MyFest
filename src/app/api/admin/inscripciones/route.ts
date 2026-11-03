import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ open: z.boolean() });

/**
 * Admin / superadmin: habilita o cierra el formulario público de pre-reserva.
 * Mientras esté cerrado, el botón de envío permanece bloqueado y la API rechaza solicitudes.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  try {
    const period = await prisma.eventPeriod.findFirst({
      where: { active: true },
      orderBy: { startedAt: "desc" },
    });
    if (period) {
      await prisma.eventPeriod.update({
        where: { id: period.id },
        data: { preReservaOpen: parsed.data.open },
      });
    } else {
      // Sin período activo se crea uno para poder guardar la habilitación.
      await prisma.eventPeriod.create({
        data: {
          name: "Evento actual",
          active: true,
          preReservaOpen: parsed.data.open,
        },
      });
    }
    return NextResponse.json({
      open: parsed.data.open,
      message: parsed.data.open
        ? "Inscripciones habilitadas: el formulario ya acepta solicitudes."
        : "Inscripciones cerradas: el botón de envío queda bloqueado.",
    });
  } catch (error) {
    console.error("Could not toggle pre-reservation gate", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el estado de las inscripciones." },
      { status: 500 },
    );
  }
}
