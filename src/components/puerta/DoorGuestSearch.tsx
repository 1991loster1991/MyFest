"use client";

import { useEffect, useState } from "react";

type GuestMatch = {
  id: string;
  fullName: string;
  dni: string;
  partySize: number;
  status?: string;
  guests?: Array<{ fullName: string; dni: string }>;
};

export function DoorGuestSearch({
  offlineGuests,
  onSelect
}: {
  offlineGuests: GuestMatch[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GuestMatch[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setMatches([]);
      setMessage("");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/puerta/search?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "No se pudo buscar.");
        setMatches(result);
        setMessage(result.length ? "" : "Sin resultados.");
      } catch (error) {
        if (controller.signal.aborted) return;
        const normalized = query.toLocaleLowerCase("es-AR");
        const digits = query.replace(/\D/g, "");
        const localMatches = offlineGuests.filter((guest) =>
          guest.fullName.toLocaleLowerCase("es-AR").includes(normalized) ||
          (digits.length >= 2 && guest.dni.replace(/\D/g, "").includes(digits)) ||
          Boolean(guest.guests?.some((companion) =>
            companion.fullName.toLocaleLowerCase("es-AR").includes(normalized) ||
            (digits.length >= 2 && companion.dni.replace(/\D/g, "").includes(digits))
          ))
        ).slice(0, 20);
        setMatches(localMatches);
        setMessage(error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : localMatches.length ? "Resultados de la última lista descargada." : "No se encontró en la lista offline.");
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [offlineGuests, query]);

  return (
    <div className="rounded-2xl bg-white p-4">
      <label className="block space-y-2 text-sm font-semibold">
        <span>Buscar por nombre o DNI</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribí nombre o DNI" className="min-h-11 w-full rounded-xl border border-black/10 px-4 font-normal" />
      </label>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}
      {matches.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
          {matches.map((guest) => (
            <li key={guest.id}>
              <button type="button" onClick={() => onSelect(guest.id)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-left text-sm hover:bg-black/5">
                <span><strong>{guest.fullName}</strong> · DNI {guest.dni}</span>
                <span className="text-xs text-muted">{guest.status === "CHECKED_IN" ? "Ya ingresó" : `${guest.partySize} persona(s)`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
