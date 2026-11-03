import { NextRequest, NextResponse } from "next/server";
import { roleHasSector, roleMatchesToken, type AdminSector, type StaffRole } from "@/lib/auth";

function sectorForPath(pathname: string): AdminSector | null {
  if (pathname === "/admin/solicitudes" || pathname.startsWith("/api/admin/evaluar")) return "RESERVATIONS";
  if (pathname === "/admin/pagos" || pathname.startsWith("/api/admin/pagos")) return "PAYMENTS";
  if (pathname === "/admin/pulseras") return "DOOR";
  if (pathname === "/admin/productos" || pathname.startsWith("/api/admin/catalog")) return "PRODUCTS";
  if (pathname === "/admin/qr-ingreso") return "QR";
  if (pathname === "/admin/incidencias") return "INCIDENTS";
  if (pathname === "/puerta" || pathname.startsWith("/api/puerta/")) return "DOOR";
  if (pathname === "/barra" || pathname.startsWith("/api/barra/")) return "BAR";
  if (pathname === "/caja" || pathname.startsWith("/api/caja/")) return "CASHIER";
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const api = pathname.startsWith("/api/");
  let allowedRoles: StaffRole[] | null = null;

  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout") return NextResponse.next();
  if (pathname.startsWith("/api/admin/staff/") || pathname === "/api/admin/staff") allowedRoles = ["SUPERADMIN"];
  else if (pathname === "/api/admin/event-period") allowedRoles = ["SUPERADMIN"];
  else if (pathname.startsWith("/api/admin/")) allowedRoles = ["SUPERADMIN", "ADMIN"];
  else if (pathname === "/admin/accesos" || pathname.startsWith("/admin/accesos/")) allowedRoles = ["SUPERADMIN"];
  else if ((pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login") allowedRoles = ["SUPERADMIN", "ADMIN"];
  else if (pathname.startsWith("/api/puerta/") || pathname === "/puerta") allowedRoles = ["SUPERADMIN", "ADMIN", "DOOR"];
  else if (pathname.startsWith("/api/barra/") || pathname === "/barra") allowedRoles = ["SUPERADMIN", "ADMIN", "BAR"];
  else if (pathname.startsWith("/api/caja/") || pathname === "/caja") allowedRoles = ["SUPERADMIN", "ADMIN", "CASHIER"];

  if (!allowedRoles) return NextResponse.next();
  const role = request.cookies.get("mauifest_role")?.value;
  const token = request.cookies.get("mauifest_staff_token")?.value;
  if (await roleMatchesToken(role, token) && allowedRoles.includes(role as StaffRole)) {
    const sector = sectorForPath(pathname);
    if (!sector || await roleHasSector(role, token, sector)) return NextResponse.next();
    if (api) return NextResponse.json({ error: "Tu perfil no tiene acceso a este sector." }, { status: 403 });
    return new NextResponse("Tu perfil no tiene acceso a este sector. Volvé al panel para abrir tus accesos habilitados.", { status: 403 });
  }
  if (api) return NextResponse.json({ error: "No autorizado para esta función." }, { status: 401 });
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/puerta/:path*", "/api/barra/:path*", "/api/caja/:path*", "/puerta", "/barra", "/caja"]
};
