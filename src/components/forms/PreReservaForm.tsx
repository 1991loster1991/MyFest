"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function maximumAdultBirthDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const year = Number(values.year) - 18;
  const month = Number(values.month) - 1;
  const date = new Date(Date.UTC(year, month, Number(values.day)));
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function PreReservaForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; priceCents: number }>>([]);
  const [catalogError, setCatalogError] = useState("");
  const [partySize, setPartySize] = useState(1);

  useEffect(() => {
    let active = true;
    fetch("/api/catalog?type=ENTRY")
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los tipos de entrada.");
        return response.json();
      })
      .then((items: Array<{ id: string; name: string; priceCents: number }>) => {
        if (active) setProducts(items);
      })
      .catch((loadError: unknown) => {
        if (active) setCatalogError(loadError instanceof Error ? loadError.message : "Error al cargar las entradas.");
      });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const data = {
      fullName: formData.get("fullName"),
      email: formData.get("email") || "",
      dni: formData.get("dni"),
      birthDate: formData.get("birthDate"),
      phone: formData.get("phone"),
      partySize: formData.get("partySize"),
      entryProductId: formData.get("entryProductId"),
      guests: Array.from({ length: Math.max(0, partySize - 1) }, (_, index) => ({
        fullName: formData.get(`guest-${index}-fullName`),
        dni: formData.get(`guest-${index}-dni`),
        birthDate: formData.get(`guest-${index}-birthDate`)
      }))
    };
    try {
      const response = await fetch("/api/pre-reserva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo enviar la solicitud.");
      router.push(`/reserva/${result.reservation.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 [&_label]:space-y-1.5 [&_label]:text-xs [&_input]:min-h-9 [&_input]:rounded-lg [&_input]:px-3 [&_input]:text-sm">
      <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink sm:col-span-2">Datos de la persona 1</p>
        <Input label="Nombre y apellido" name="fullName" autoComplete="name" required />
        <Input label="DNI" name="dni" inputMode="numeric" required />
        <Input label="Email (opcional)" name="email" type="email" autoComplete="email" />
        <Input label="Teléfono" name="phone" type="tel" autoComplete="tel" required />
        <Input
          label="Fecha de nacimiento (solo mayores de 18)"
          name="birthDate"
          type="date"
          max={maximumAdultBirthDate()}
          required
        />
        <Input label="Personas (máximo 10)" name="partySize" type="number" min="1" max="10" defaultValue={1} onChange={(event) => setPartySize(Number(event.target.value) || 1)} required />
        <label className="block min-w-0 space-y-1.5 text-xs font-medium text-ink">
          <span>Tipo de entrada</span>
          <select
            name="entryProductId"
            required
            disabled={products.length === 0}
            className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-ink"
            defaultValue=""
          >
            <option value="" disabled>{products.length ? "Elegí una entrada" : "Catálogo no disponible"}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.priceCents > 0 ? `$${(product.priceCents / 100).toLocaleString("es-AR")}` : "precio demo a definir"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {partySize > 1 && (
        <fieldset className="space-y-3 rounded-2xl bg-paper p-4 sm:p-5">
          <legend className="px-2 text-sm font-bold">Datos de cada acompañante</legend>
          <p className="text-xs leading-5 text-muted">Completá los datos de cada persona por separado. Todos los asistentes deben ser mayores de 18 años.</p>
          {Array.from({ length: partySize - 1 }, (_, index) => (
            <div key={index} className="rounded-xl border border-black/10 bg-white p-3 sm:p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-ink">Persona {index + 2}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Nombre y apellido" name={`guest-${index}-fullName`} autoComplete="name" required minLength={3} />
                <Input label="DNI" name={`guest-${index}-dni`} inputMode="numeric" required minLength={6} />
                <Input label="Fecha de nacimiento" name={`guest-${index}-birthDate`} type="date" max={maximumAdultBirthDate()} required />
              </div>
            </div>
          ))}
        </fieldset>
      )}
      {(error || catalogError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error || catalogError}</p>}
      <Button type="submit" disabled={busy || products.length === 0} className="w-full sm:w-auto">
        {busy ? "Enviando..." : "Enviar solicitud"}
      </Button>
      <p className="text-[10px] leading-4 text-muted">Evento para mayores de 18 años. Deberás registrar el nombre, DNI y fecha de nacimiento de cada persona. La pre-reserva queda sujeta a confirmación. Las opciones DEMO todavía no representan precios reales.</p>
    </form>
  );
}
