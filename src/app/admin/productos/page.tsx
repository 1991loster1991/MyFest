import { prisma } from "@/lib/prisma";
import { CatalogManager } from "@/components/admin/CatalogManager";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.catalogProduct.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <section>
      <h2 className="text-2xl font-black">Catálogo y precios</h2>
      <p className="mb-5 mt-2 max-w-2xl text-sm leading-6 text-muted">Las entradas y consumiciones están precargadas como demo a $0. Editá y guardá el precio antes de habilitar pagos.</p>
      {products.length ? <CatalogManager initialProducts={products} /> : <p className="rounded-2xl bg-white p-6 text-sm">No hay productos. Ejecutá <code>npm run db:seed</code>.</p>}
    </section>
  );
}
