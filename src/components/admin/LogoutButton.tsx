"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión. Intentá nuevamente.");
      window.location.replace("/admin/login");
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "No se pudo cerrar la sesión. Intentá nuevamente.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => void logout()} disabled={busy}>
        {busy ? "Cerrando…" : "Cerrar sesión"}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
