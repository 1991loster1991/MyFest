"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [alias, setAlias] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const secret = new FormData(event.currentTarget).get("secret");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, role: role === "CUSTOM" ? customRole : role, alias })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Clave incorrecta o acceso no configurado.");
      const next = new URLSearchParams(window.location.search).get("next");
      const defaultRoute = result.role === "DOOR" ? "/puerta" : result.role === "BAR" ? "/barra" : result.role === "CASHIER" ? "/caja" : "/admin";
      router.replace(next?.startsWith("/") ? next : defaultRoute);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-5 sm:py-20">
      <div className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUIFEST / EQUIPO</p>
        <h1 className="mt-3 text-3xl font-black">Acceso interno</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Ingresá el perfil al que querés acceder. La llave maestra sirve para entrar en cualquier perfil; las claves individuales conservan los permisos asignados.</p>
        <form onSubmit={login} className="mt-7 space-y-5">
          <label className="block space-y-2 text-sm font-medium text-ink">
            <span>Perfil</span>
            <select
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-black/10 bg-white px-4"
              required
            >
              <option value="" disabled>Seleccioná un perfil</option>
              <option value="ADMIN">Administrador sectorial</option>
              <option value="DOOR">Puerta / seguridad</option>
              <option value="BAR">Barra</option>
              <option value="CASHIER">Caja / ventas</option>
              <option value="CUSTOM">Otro perfil</option>
            </select>
          </label>
          {role === "CUSTOM" && <Input label="Escribí el perfil" name="custom-role" type="text" autoComplete="off" value={customRole} onChange={(event) => setCustomRole(event.target.value)} required />}
          {role === "ADMIN" && <Input label="Alias del administrador" name="alias" type="text" autoComplete="username" value={alias} onChange={(event) => setAlias(event.target.value)} required />}
          <PasswordInput label="Clave" name="secret" autoComplete="current-password" required />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button className="w-full" disabled={busy}>{busy ? "Validando..." : "Ingresar"}</Button>
        </form>
      </div>
    </div>
  );
}
