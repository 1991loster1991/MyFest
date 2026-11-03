"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

const sectorLabels: Record<string, string> = {
  DASHBOARD: "Resumen completo",
  RESERVATIONS: "Solicitudes",
  PAYMENTS: "Pagos",
  PRODUCTS: "Productos",
  QR: "QR pre-reserva",
  INCIDENTS: "Incidencias",
  DOOR: "Puerta",
  BAR: "Barra",
  CASHIER: "Caja"
};
const allSectors = Object.keys(sectorLabels);

type StaffAccount = { id: string; name: string; alias: string; sectors: string[]; active: boolean; createdAt: string };
type NewStaff = { name: string; alias: string; password: string; sectors: string[] };

const emptyNewStaff: NewStaff = { name: "", alias: "", password: "", sectors: [] };

export function StaffAccessManager() {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [draft, setDraft] = useState<NewStaff>(emptyNewStaff);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar las cuentas.");
      setAccounts(result.accounts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las cuentas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function toggleSector(current: string[], sector: string) {
    return current.includes(sector) ? current.filter((value) => value !== sector) : [...current, sector];
  }

  function toggleAllSectors(current: string[]) {
    return allSectors.every((sector) => current.includes(sector)) ? [] : allSectors;
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo crear la cuenta.");
      setDraft(emptyNewStaff);
      setMessage("Cuenta creada. Los accesos ya quedaron asignados.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount(account: StaffAccount) {
    setBusy(true);
    setError("");
    setMessage("");
    const password = passwords[account.id] ?? "";
    try {
      const response = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...account, ...(password ? { password } : {}) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudieron guardar los permisos.");
      setPasswords((current) => ({ ...current, [account.id]: "" }));
      setMessage(`Accesos de ${account.name} actualizados. La persona debe volver a iniciar sesión para recibir los cambios.`);
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los permisos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <form onSubmit={createAccount} className="space-y-5 rounded-2xl bg-white p-5 shadow-card sm:p-7">
        <div><h3 className="text-lg font-bold">Crear administrador sectorial</h3><p className="mt-1 text-sm text-muted">Asignale una clave propia y los sectores que puede administrar.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre" name="staff-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required minLength={2} />
          <Input label="Alias de acceso" name="staff-alias" type="text" autoComplete="username" placeholder="ej.: maui-admin" value={draft.alias} onChange={(event) => setDraft({ ...draft, alias: event.target.value })} required />
          <PasswordInput label="Clave (mínimo 12 caracteres)" name="staff-password" autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} required minLength={12} />
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold">Sectores habilitados</legend>
          <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gold/40 bg-paper px-3 text-sm font-semibold sm:col-span-2 lg:col-span-3">
            <input type="checkbox" checked={allSectors.every((sector) => draft.sectors.includes(sector))} onChange={() => setDraft({ ...draft, sectors: toggleAllSectors(draft.sectors) })} />Seleccionar todos
          </label>
          {Object.entries(sectorLabels).map(([sector, label]) => (
            <label key={sector} className="flex min-h-10 items-center gap-2 rounded-lg bg-paper px-3 text-sm">
              <input type="checkbox" checked={draft.sectors.includes(sector)} onChange={() => setDraft({ ...draft, sectors: toggleSector(draft.sectors, sector) })} />{label}
            </label>
          ))}
        </fieldset>
        <Button disabled={busy}>{busy ? "Guardando…" : "Crear cuenta"}</Button>
      </form>

      <section className="space-y-4">
        <div><h3 className="text-lg font-bold">Cuentas y permisos</h3><p className="mt-1 text-sm text-muted">Desactivá cuentas o cambiá sus sectores. Una sesión activa conserva sus accesos hasta que vuelva a iniciar sesión o venza.</p></div>
        {loading ? <p className="rounded-2xl bg-white p-6 text-muted">Cargando cuentas…</p> : accounts.length ? accounts.map((account) => (
          <article key={account.id} className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" name={`name-${account.id}`} value={account.name} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, name: event.target.value } : item))} />
              <Input label="Alias de acceso" name={`alias-${account.id}`} type="text" autoComplete="username" value={account.alias} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, alias: event.target.value } : item))} />
              <PasswordInput label="Nueva clave (opcional, mínimo 12)" name={`password-${account.id}`} autoComplete="new-password" value={passwords[account.id] ?? ""} onChange={(event) => setPasswords((current) => ({ ...current, [account.id]: event.target.value }))} minLength={12} />
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <legend className="mb-2 text-sm font-semibold">Sectores habilitados</legend>
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gold/40 bg-paper px-3 text-sm font-semibold sm:col-span-2 lg:col-span-3">
                <input type="checkbox" checked={allSectors.every((sector) => account.sectors.includes(sector))} onChange={() => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, sectors: toggleAllSectors(item.sectors) } : item))} />Seleccionar todos
              </label>
              {Object.entries(sectorLabels).map(([sector, label]) => (
                <label key={sector} className="flex min-h-10 items-center gap-2 rounded-lg bg-paper px-3 text-sm">
                  <input type="checkbox" checked={account.sectors.includes(sector)} onChange={() => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, sectors: toggleSector(item.sectors, sector) } : item))} />{label}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={account.active} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, active: event.target.checked } : item))} />Cuenta activa</label>
              <Button type="button" onClick={() => void saveAccount(account)} disabled={busy}>Guardar cambios</Button>
            </div>
          </article>
        )) : <p className="rounded-2xl bg-white p-6 text-muted">Todavía no hay administradores sectoriales.</p>}
      </section>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}
    </div>
  );
}
