import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  qrCode: z.string().trim().min(3).max(80),
  active: z.boolean(),
});

/**
 * Superadmin: activa o desactiva el QR de un cliente cuando sea necesario.
 * El código QR nunca cambia; solo se habilita o bloquea su validez.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  try {
    const load = await prisma.eventLoad.findFirst({
      where: { qrCode: parsed.data.qrCode },
      orderBy: { createdAt: "desc" },
    });
    if (!load)
      return NextResponse.json(
        { error: "No hay ninguna carga de evento para ese QR." },
        { status: 404 },
      );
    const now = new Date();
    const updated = await prisma.eventLoad.update({
      where: { id: load.id },
      data: parsed.data.active
        ? {
            deactivatedAt: null,
            deactivatedBy: null,
            accessStatus:
              load.accessStatus === "REJECTED" ||
              load.accessStatus === "DELIVERED"
                ? "PENDING"
                : load.accessStatus,
            rejectionReason:
              load.accessStatus === "REJECTED" ? null : load.rejectionReason,
          }
        : { deactivatedAt: now, deactivatedBy: "SUPERADMIN" },
    });
    return NextResponse.json({
      active: parsed.data.active,
      accessStatus: updated.accessStatus,
      message: parsed.data.active
        ? `QR de ${updated.personName} activado por administración.`
        : `QR de ${updated.personName} desactivado por administración.`,
    });
  } catch (error) {
    console.error("Could not toggle QR as superadmin", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el QR." },
      { status: 500 },
    );
  }
}
