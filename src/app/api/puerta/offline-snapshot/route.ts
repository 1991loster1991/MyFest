import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { status: "APPROVED", paymentStatus: "PAID" },
      select: {
        id: true,
        fullName: true,
        dni: true,
        partySize: true,
        checkedInAt: true,
        wristbandCode: true,
        guests: { select: { fullName: true, dni: true, checkedInAt: true, wristbandCode: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json({ downloadedAt: new Date().toISOString(), reservations });
  } catch (error) {
    console.error("Could not prepare offline door list", error);
    return NextResponse.json({ error: "No se pudo descargar la lista de acceso." }, { status: 500 });
  }
}
