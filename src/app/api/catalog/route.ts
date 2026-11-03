import { CatalogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const typeValue = searchParams.get("type");
  if (typeValue && !Object.values(CatalogType).includes(typeValue as CatalogType)) {
    return NextResponse.json({ error: "Tipo de producto inválido." }, { status: 400 });
  }
  try {
    const products = await prisma.catalogProduct.findMany({
      where: { active: true, ...(typeValue ? { type: typeValue as CatalogType } : {}) },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Could not load catalog", error);
    return NextResponse.json({ error: "No se pudo cargar el catálogo." }, { status: 500 });
  }
}
