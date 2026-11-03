import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { incidentSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = incidentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Incidencia inválida." }, { status: 400 });
  try {
    if (parsed.data.reservationId) {
      const reservation = await prisma.reservation.findUnique({ where: { id: parsed.data.reservationId }, select: { id: true } });
      if (!reservation) return NextResponse.json({ error: "No se encontró la reserva relacionada." }, { status: 404 });
    }
    const incident = await prisma.admissionIncident.create({
      data: {
        reservationId: parsed.data.reservationId,
        reason: parsed.data.reason,
        details: parsed.data.details,
        operatorRole: request.cookies.get("mauifest_role")?.value ?? "DOOR"
      }
    });
    return NextResponse.json({ incidentId: incident.id, createdAt: incident.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Could not record admission incident", error);
    return NextResponse.json({ error: "No se pudo registrar la incidencia." }, { status: 500 });
  }
}
