"use client";

import { useEffect, useMemo, useState } from "react";
import { BarOrderCard } from "@/components/barra/BarOrderCard";
import { DniScanner } from "@/components/scanners/DniScanner";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRealtimeBar } from "@/hooks/useRealtimeBar";
import { formatMoney } from "@/lib/utils";

type CatalogProductOption = { id: string; name: string; priceCents: number };

function isCatalogProductOption(value: unknown): value is CatalogProductOption {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  return typeof product.id === "string" &&
    typeof product.name === "string" &&
    typeof product.priceCents === "number" &&
    Number.isInteger(product.priceCents);
}

export default function BarPage() {
  const { orders, setOrders, error, refresh } = useRealtimeBar();
  const [dni, setDni] = useState("");
  const [products, setProducts] = useState<CatalogProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "PENDING"), [orders]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const response = await fetch("/api/catalog?type=DRINK", { signal: controller.signal });
        if (!response.ok) throw new Error("No se pudo cargar el catálogo de barra.");
        const result: unknown = await response.json();
        if (!Array.isArray(result) || !result.every(isCatalogProductOption)) {
          throw new Error("El catálogo devolvió datos inválidos.");
        }
        setProducts(result);
        setProductId(result[0]?.id ?? "");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setMessage(loadError instanceof Error ? loadError.message : "Error al cargar productos.");
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, []);

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/barra/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni, productId, quantity, paymentMethod })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo crear el pedido.");
      setMessage(`Pedido agregado para ${result.order.guestName}.`);
      setDni("");
      setQuantity("1");
      await refresh();
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl min-w-0 space-y-7 sm:space-y-8">
      <section>
        <h2 className="text-2xl font-black">Venta en barra</h2>
        <p className="mt-1 text-sm text-muted">Cargá la consumición y confirmá el cobro. El ticket entra a la cola al instante.</p>
        <form onSubmit={createOrder} className="mt-4 grid min-w-0 gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2 sm:p-5">
          <DniScanner value={dni} onChange={setDni} />
          <label className="block space-y-2 text-sm font-medium">
            <span>Producto</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required disabled={!products.length} className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4">
              <option value="" disabled>Elegí un trago</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatMoney(product.priceCents)}</option>)}
            </select>
          </label>
          <Input label="Cantidad" name="quantity" type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          <label className="block space-y-2 text-sm font-medium">
            <span>Medio de pago (verificado en caja)</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4">
              <option value="CASH">Efectivo cobrado</option>
              <option value="TRANSFER">Transferencia verificada</option>
            </select>
          </label>
          <div className="flex items-end"><Button type="submit" disabled={busy} className="w-full">{busy ? "Agregando..." : "Agregar a la cola"}</Button></div>
          {message && <p role="status" className="text-sm text-muted sm:col-span-2">{message}</p>}
        </form>
      </section>
      <section>
        <div className="mb-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between"><div><h2 className="text-2xl font-black">Cola de barra</h2><p className="mt-1 text-sm text-muted">Actualización automática cada 5 segundos.</p></div><Button variant="secondary" type="button" onClick={() => void refresh()}>Actualizar</Button></div>
        {error && <p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}
        {pendingOrders.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-muted">No hay pedidos pendientes.</p> :
          <div className="space-y-3">{pendingOrders.map((order) => <BarOrderCard key={order.id} order={order} onDelivered={(id) => setOrders((current) => current.map((item) => item.id === id ? { ...item, status: "DELIVERED" } : item))} />)}</div>}
      </section>
    </div>
  );
}
