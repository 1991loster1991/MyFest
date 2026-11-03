"use client";

import { useCallback, useEffect, useState } from "react";
import type { BarOrderSummary } from "@/types";

export function useRealtimeBar() {
  const [orders, setOrders] = useState<BarOrderSummary[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/barra/orders", { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar los pedidos.");
      setOrders(await response.json());
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar pedidos.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { orders, setOrders, error, refresh };
}
