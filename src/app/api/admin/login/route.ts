import { NextResponse } from "next/server";
import { getConfiguredRoleToken, createAdminSessionToken, isStaffRole, type AdminSector } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const role = body && typeof body === "object" && "role" in body ? body.role : null;
  const secret = body && typeof body === "object" && "secret" in body ? body.secret : null;
  const alias = body && typeof body === "object" && "alias" in body ? body.alias : null;
  if (!isStaffRole(role)) return NextResponse.json({ error: "Seleccioná un perfil válido." }, { status: 400 });
  if (typeof secret !== "string" || secret.length === 0 || secret.length > 200) {
    return NextResponse.json({ error: "Ingresá una clave." }, { status: 400 });
  }

  let token: string | null = null;
  if (role === "ADMIN") {
    if (typeof alias !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{1,253}$/.test(alias)) return NextResponse.json({ error: "Ingresá tu alias de acceso." }, { status: 400 });
    try {
      const account = await prisma.staffAdmin.findUnique({ where: { alias: alias.trim().toLowerCase() } });
      if (!account?.active || !verifyPassword(secret, account.passwordHash)) {
        return NextResponse.json({ error: "Email o clave incorrectos, o cuenta desactivada." }, { status: 401 });
      }
      token = await createAdminSessionToken({ sub: account.id, name: account.name, sectors: account.sectors as AdminSector[] });
    } catch (error) {
      console.error("Could not authenticate sector admin", error);
      return NextResponse.json({ error: "No se pudo validar la cuenta." }, { status: 500 });
    }
  } else {
    const configuredSecret = getConfiguredRoleToken(role);
    if (!configuredSecret) return NextResponse.json({ error: `El acceso ${role} todavía no está configurado en el servidor.` }, { status: 503 });
    if (secret !== configuredSecret) return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
    token = configuredSecret;
  }

  const response = NextResponse.json({ ok: true });
  const cookieOptions = { httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 };
  response.cookies.set("mauifest_role", role, cookieOptions);
  response.cookies.set("mauifest_staff_token", token, cookieOptions);
  return response;
}
