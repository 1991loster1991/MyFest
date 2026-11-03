import { StaffAccessManager } from "@/components/admin/StaffAccessManager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function StaffAccessPage() {
  return (
    <section>
      <Link href="/admin" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold transition hover:border-gold hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />Volver al dashboard
      </Link>
      <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUI FEST / SUPERADMIN</p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">Accesos de equipo</h2>
      <p className="mb-6 mt-2 max-w-2xl text-sm leading-6 text-muted">Creá administradores sectoriales, asignales permisos y desactivá sus cuentas. Solo la llave maestra puede abrir esta sección.</p>
      <StaffAccessManager />
    </section>
  );
}
