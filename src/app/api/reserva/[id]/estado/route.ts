import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true, status: true }
    });
    if (!reservation) return NextResponse.json({ error: "No se encontró la solicitud." }, { status: 404 });
    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Could not retrieve reservation status", error);
    return NextResponse.json({ error: "No se pudo consultar el estado de la solicitud." }, { status: 500 });
  }
}
