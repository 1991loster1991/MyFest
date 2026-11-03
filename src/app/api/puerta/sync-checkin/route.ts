import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { activateAttendee, DoorAccessError, newWristbandCode } from "@/lib/door-access";

const syncItemSchema = z.union([
  z.string().min(1),
  z.object({ reservationId: z.string().min(1), dni: z.string().min(6), wristbandCode: z.string().min(3).max(80) })
]);
const syncSchema = z.object({ reservationIds: z.array(syncItemSchema).max(500) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Cola de ingresos inválida." }, { status: 400 });
  try {
    const results = await Promise.all(parsed.data.reservationIds.map(async (item) => {
      if (typeof item !== "string") {
        try {
          const result = await activateAttendee(item.reservationId, item.dni, item.wristbandCode);
          return { id: item.reservationId, dni: item.dni, synced: true, wristbandCode: result.activatedAttendee?.wristbandCode ?? item.wristbandCode };
        } catch (error) {
          return { id: item.reservationId, dni: item.dni, synced: false, reason: error instanceof DoorAccessError ? error.message : "No se pudo sincronizar." };
        }
      }
      const update = await prisma.reservation.updateMany({
        where: { id: item, status: "APPROVED", paymentStatus: "PAID" },
        data: { status: "CHECKED_IN", checkedInAt: new Date(), wristbandCode: await newWristbandCode() }
      });
      return { id: item, synced: update.count === 1 };
    }));
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Could not sync offline check-ins", error);
    return NextResponse.json({ error: "No se pudo sincronizar la cola de ingresos." }, { status: 500 });
  }
}
