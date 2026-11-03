import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { eventLoadView } from "@/lib/event-loads";

const scanSchema = z.object({ qrCode: z.string().trim().min(3).max(80) });

/** Superadmin: busca el QR de un cliente para activarlo o desactivarlo manualmente. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Ingresá el código QR o el DNI." },
      { status: 400 },
    );
  try {
    const code = parsed.data.qrCode;
    const digits = code.replace(/\D/g, "");
    const load = await prisma.eventLoad.findFirst({
      where: {
        OR: [
          { qrCode: code },
          ...(digits.length >= 6 ? [{ dni: digits }] : []),
          ...(digits.length >= 6 ? [{ reservation: { dni: digits } }] : []),
          ...(digits.length >= 6
            ? [{ reservation: { guests: { some: { dni: digits } } } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        reservation: {
          select: {
            id: true,
            fullName: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });
    if (!load)
      return NextResponse.json(
        { error: "No hay ninguna carga de evento para ese QR o DNI." },
        { status: 404 },
      );
    const history = await prisma.eventLoad.findMany({
      where: { reservationId: load.reservationId, guestId: load.guestId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return NextResponse.json({
      load: eventLoadView(load),
      reservation: load.reservation,
      isActive: !load.deactivatedAt && load.accessStatus !== "DELIVERED",
      history: history.map(eventLoadView),
    });
  } catch (error) {
    console.error("Could not scan load for superadmin", error);
    return NextResponse.json(
      { error: "No se pudo consultar la carga del cliente." },
      { status: 500 },
    );
  }
}
