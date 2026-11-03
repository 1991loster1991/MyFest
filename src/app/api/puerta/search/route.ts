import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: "Ingresá al menos dos caracteres." }, { status: 400 });
  }
  try {
    const digits = query.replace(/\D/g, "");
    const matches = await prisma.reservation.findMany({
      where: {
        paymentStatus: "PAID",
        status: { in: ["ACTIVATED", "CHECKED_IN"] },
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { guests: { some: { fullName: { contains: query, mode: "insensitive" } } } },
          ...(digits.length >= 6 ? [{ guests: { some: { dni: { contains: digits } } } }] : []),
          ...(digits.length >= 6 ? [{ dni: { contains: digits } }] : [])
        ]
      },
      select: { id: true, fullName: true, dni: true, partySize: true, status: true, guests: { select: { fullName: true, dni: true } } },
      take: 20,
      orderBy: { fullName: "asc" }
    });
    return NextResponse.json(matches);
  } catch (error) {
    console.error("Could not search door reservations", error);
    return NextResponse.json({ error: "No se pudo buscar en la lista." }, { status: 500 });
  }
}
