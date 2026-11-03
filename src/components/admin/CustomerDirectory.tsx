"use client";

import { useMemo, useState } from "react";

export type CustomerRecord = {
  name: string;
  dni: string;
  birthDate: string;
  email: string;
  phone: string;
  registrationType: "Titular" | "Acompañante";
  contactName: string;
  reservations: number;
  attendances: Array<{ event: string; date: string; time: string }>;
  purchases: Array<{ item: string; quantity: number; date: string; status: string }>;
};

export function CustomerDirectory({ customers }: { customers: CustomerRecord[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("es-AR");
    if (!value) return customers;
    return customers.filter((customer) => [customer.name, customer.dni, customer.email, customer.phone]
      .some((field) => field.toLocaleLowerCase("es-AR").includes(value)));
  }, [customers, query]);

  return (
    <div>
      <label className="mb-5 block">
        <span className="sr-only">Buscar personas</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, DNI, email o teléfono" className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 outline-none focus:border-ink" />
      </label>
      <p className="mb-4 text-sm text-muted">{filtered.length} de {customers.length} personas</p>
      {filtered.length ? <div className="space-y-4">
        {filtered.map((customer) => (
          <article key={customer.dni} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{customer.name}</h3>
                <p className="mt-1 text-sm text-muted">DNI {customer.dni} · {customer.registrationType}</p>
              </div>
              <div className="rounded-full bg-paper px-4 py-2 text-sm font-semibold">{customer.attendances.length} {customer.attendances.length === 1 ? "fiesta" : "fiestas"}</div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted">Fecha de nacimiento</dt><dd className="font-medium">{customer.birthDate || "Sin dato"}</dd></div>
              <div><dt className="text-muted">Email</dt><dd className="break-all font-medium">{customer.email || "Sin dato"}</dd></div>
              <div><dt className="text-muted">Teléfono</dt><dd className="font-medium">{customer.phone || "Sin dato"}</dd></div>
              <div><dt className="text-muted">Reservas</dt><dd className="font-medium">{customer.reservations}</dd></div>
            </dl>
            {customer.registrationType === "Acompañante" && <p className="mt-3 text-xs text-muted">Registrado como acompañante de {customer.contactName}</p>}
            <div className="mt-5 grid gap-5 border-t border-black/5 pt-4 lg:grid-cols-2">
              <section>
                <h4 className="text-sm font-bold">Asistencias e ingresos</h4>
                {customer.attendances.length ? <ul className="mt-2 space-y-2 text-sm">
                  {customer.attendances.map((attendance) => <li key={`${attendance.event}-${attendance.date}-${attendance.time}`} className="rounded-xl bg-paper p-3"><span className="font-semibold">{attendance.event}</span><span className="mt-1 block text-muted">{attendance.date} · Ingreso {attendance.time}</span></li>)}
                </ul> : <p className="mt-2 text-sm text-muted">Todavía no tiene ingresos registrados.</p>}
              </section>
              <section>
                <h4 className="text-sm font-bold">Consumiciones asociadas a sus reservas</h4>
                {customer.purchases.length ? <ul className="mt-2 space-y-2 text-sm">
                  {customer.purchases.map((purchase, index) => <li key={`${purchase.item}-${purchase.date}-${index}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-paper p-3"><span>{purchase.item} × {purchase.quantity}</span><span className="text-muted">{purchase.status} · {purchase.date}</span></li>)}
                </ul> : <p className="mt-2 text-sm text-muted">No hay consumiciones registradas.</p>}
              </section>
            </div>
          </article>
        ))}
      </div> : <p className="rounded-2xl bg-white p-8 text-center text-muted">No encontramos personas con esos datos.</p>}
    </div>
  );
}
