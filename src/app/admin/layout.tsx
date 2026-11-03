import Link from "next/link";
import { cookies } from "next/headers";
import { getAdminSession, roleMatchesToken } from "@/lib/auth";
import { LogoutButton } from "@/components/admin/LogoutButton";

const adminLinks = [
  { label: "Resumen", href: "/admin", sector: null },
  { label: "Solicitudes", href: "/admin/solicitudes", sector: "RESERVATIONS" },
  { label: "Clientes", href: "/admin/clientes", sector: "RESERVATIONS" },
  { label: "Pagos", href: "/admin/pagos", sector: "PAYMENTS" },
  { label: "Productos", href: "/admin/productos", sector: "PRODUCTS" },
  { label: "QR pre-reserva", href: "/admin/qr-ingreso", sector: "QR" },
  { label: "Incidencias", href: "/admin/incidencias", sector: "INCIDENTS" },
  { label: "Pulseras QR", href: "/admin/pulseras", sector: "DOOR" },
  { label: "QR de clientes", href: "/admin/qr-clientes", sector: "SUPERADMIN" },
  { label: "Puerta", href: "/puerta", sector: "DOOR" },
  { label: "Barra", href: "/barra", sector: "BAR" },
  { label: "Caja", href: "/caja", sector: "CASHIER" },
  { label: "Accesos de equipo", href: "/admin/accesos", sector: "SUPERADMIN" }
] as const;

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const role = cookieStore.get("mauifest_role")?.value;
  const token = cookieStore.get("mauifest_staff_token")?.value;
  const isAuthenticated = await roleMatchesToken(role, token);
  const session = role === "ADMIN" ? await getAdminSession(token) : null;
  const links = isAuthenticated
    ? adminLinks.filter(({ sector }) => role === "SUPERADMIN" || sector === null || (sector !== "SUPERADMIN" && session?.sectors.includes(sector)))
    : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
      <div className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUI FEST / OPERACIONES</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Panel del evento</h1>
        </div>
        <nav aria-label="Navegación de operaciones" className="grid w-full grid-cols-2 gap-2 text-sm font-semibold sm:flex sm:w-auto sm:flex-wrap">
          {links.map(({ label, href }) => <Link key={href} className="flex min-h-11 items-center justify-center rounded-full bg-white px-3 text-center sm:px-4" href={href}>{label}</Link>)}
          {isAuthenticated && <LogoutButton />}
        </nav>
      </div>
      {children}
    </div>
  );
}
