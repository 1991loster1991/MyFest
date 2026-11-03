"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CatalogProduct } from "@prisma/client";

export function CatalogManager({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  async function save(product: CatalogProduct, formData: FormData) {
    const price = Number(formData.get("price"));
    const payload = {
      id: product.id,
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      priceCents: Math.round(price * 100),
      active: formData.get("active") === "on",
      eventDate: String(formData.get("eventDate") ?? "").trim(),
      eventPlace: String(formData.get("eventPlace") ?? "").trim(),
      includedItem: String(formData.get("includedItem") ?? "").trim()
    };
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Ingresá un precio válido, mayor o igual a cero.");
      return;
    }

    setSavingId(product.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el producto.");
      setProducts((current) => current.map((item) => item.id === product.id ? result.product : item));
      setMessage("Catálogo actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrió un error.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <form key={product.id} className="grid gap-4 rounded-2xl bg-white p-4 shadow-card sm:grid-cols-2 sm:p-5" action={(formData) => void save(product, formData)}>
          <label className="block space-y-2 text-sm font-medium">
            <span>Producto</span>
            <input name="name" defaultValue={product.name} required minLength={2} maxLength={100} className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Precio (ARS)</span>
            <input name="price" type="number" min="0" step="0.01" defaultValue={(product.priceCents / 100).toFixed(2)} required className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
          </label>
          <label className="block space-y-2 text-sm font-medium sm:col-span-2">
            <span>Descripción</span>
            <input name="description" defaultValue={product.description ?? ""} maxLength={300} className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
          </label>
          {product.type === "ENTRY" && (
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium">
                <span>Fecha del evento</span>
                <input name="eventDate" type="date" defaultValue={product.eventDate ?? ""} className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                <span>Lugar del evento</span>
                <input name="eventPlace" defaultValue={product.eventPlace ?? ""} maxLength={120} placeholder="Salón, dirección, localidad" className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
              </label>
              <label className="block space-y-2 text-sm font-medium sm:col-span-2">
                <span>Consumición incluida con la entrada (se retira en barra)</span>
                <input name="includedItem" defaultValue={product.includedItem ?? ""} maxLength={80} placeholder="Ej.: 1 trago a elección" className="min-h-11 w-full rounded-xl border border-black/10 px-3" />
              </label>
              <p className="text-xs text-muted sm:col-span-2">Se incluyen en el mensaje de confirmación que recibe el cliente por WhatsApp y en la campanita.</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input name="active" type="checkbox" defaultChecked={product.active} />
            Activo para reservas
          </label>
          <div className="sm:justify-self-end">
            <Button type="submit" disabled={savingId === product.id}>{savingId === product.id ? "Guardando..." : "Guardar cambios"}</Button>
          </div>
          {product.isDemo && <p className="text-xs text-amber-800 sm:col-span-2">Producto demo: cargá el nombre y el precio real antes de habilitar ventas.</p>}
        </form>
      ))}
      {message && <p role="status" className="rounded-xl bg-white p-3 text-sm">{message}</p>}
    </div>
  );
}
