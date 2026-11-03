import { PrismaClient, CatalogType } from "@prisma/client";

const prisma = new PrismaClient();

const demoProducts = [
  { type: CatalogType.ENTRY, name: "Basic", description: "Entrada Basic. Precio editable desde el catálogo.", priceCents: 0 },
  { type: CatalogType.ENTRY, name: "Gold", description: "Entrada Gold. Precio editable desde el catálogo.", priceCents: 0 },
  { type: CatalogType.ENTRY, name: "V.I.P.", description: "Entrada V.I.P. Precio editable desde el catálogo.", priceCents: 0 },
  { type: CatalogType.DRINK, name: "Trago clásico (DEMO)", description: "Precio de demostración editable.", priceCents: 0 },
  { type: CatalogType.DRINK, name: "Trago especial (DEMO)", description: "Precio de demostración editable.", priceCents: 0 }
];

async function main() {
  await prisma.catalogProduct.updateMany({
    where: {
      type: CatalogType.ENTRY,
      isDemo: true,
      name: { in: ["Entrada general (DEMO)", "Entrada VIP (DEMO)"] }
    },
    data: { active: false }
  });

  for (const product of demoProducts) {
    await prisma.catalogProduct.upsert({
      where: { type_name: { type: product.type, name: product.name } },
      update: {},
      create: { ...product, isDemo: true }
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Could not seed demo catalog", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
