import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const name = body && typeof body === "object" && "name" in body ? body.name : null;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json({ error: "El nombre del evento debe tener entre 2 y 100 caracteres." }, { status: 400 });
  }
  try {
    const startedAt = new Date();
    const period = await prisma.$transaction(async (transaction) => {
      await transaction.eventPeriod.updateMany({ where: { active: true }, data: { active: false, endedAt: startedAt } });
      return transaction.eventPeriod.create({ data: { name: name.trim(), startedAt, active: true } });
    });
    return NextResponse.json({ period }, { status: 201 });
  } catch (error) {
    console.error("Could not start new event period", error);
    return NextResponse.json({ error: "No se pudo iniciar el nuevo evento." }, { status: 500 });
  }
}
