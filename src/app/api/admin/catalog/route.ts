import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { catalogUpdateSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = catalogUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Producto inválido." }, { status: 400 });
  try {
    const product = await prisma.catalogProduct.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        priceCents: parsed.data.priceCents,
        active: parsed.data.active,
        eventDate: parsed.data.eventDate || null,
        eventPlace: parsed.data.eventPlace || null,
        includedItem: parsed.data.includedItem || null,
        isDemo: parsed.data.priceCents === 0 || parsed.data.name.toLocaleUpperCase("es-AR").includes("DEMO")
      }
    });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Could not update catalog product", error);
    return NextResponse.json({ error: "No se pudo guardar el producto." }, { status: 500 });
  }
}
