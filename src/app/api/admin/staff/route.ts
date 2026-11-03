import { NextResponse } from "next/server";
import { ADMIN_SECTORS, isAdminSector } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function validSectors(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isAdminSector);
}

function publicAccount<T extends { passwordHash: string }>(account: T) {
  const { passwordHash: _passwordHash, ...safeAccount } = account;
  return safeAccount;
}

export async function GET() {
  const accounts = await prisma.staffAdmin.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return NextResponse.json({ accounts: accounts.map(publicAccount), availableSectors: ADMIN_SECTORS });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const { name, alias, password, sectors } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) return NextResponse.json({ error: "Ingresá un nombre válido." }, { status: 400 });
  if (typeof alias !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{1,253}$/.test(alias.trim())) return NextResponse.json({ error: "Ingresá un alias válido (sin espacios)." }, { status: 400 });
  if (typeof password !== "string" || password.length < 12 || password.length > 200) return NextResponse.json({ error: "La clave debe tener al menos 12 caracteres." }, { status: 400 });
  if (!validSectors(sectors)) return NextResponse.json({ error: "Seleccioná sectores válidos." }, { status: 400 });
  try {
    const account = await prisma.staffAdmin.create({ data: { name: name.trim(), alias: alias.trim().toLowerCase(), passwordHash: hashPassword(password), sectors } });
    return NextResponse.json({ account: publicAccount(account) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ya existe una cuenta con ese alias." }, { status: 409 });
    console.error("Could not create sector admin", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const { id, name, alias, password, sectors, active } = body as Record<string, unknown>;
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Cuenta inválida." }, { status: 400 });
  if (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100)) return NextResponse.json({ error: "Ingresá un nombre válido." }, { status: 400 });
  if (alias !== undefined && (typeof alias !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{1,253}$/.test(alias.trim()))) return NextResponse.json({ error: "Ingresá un alias válido, sin espacios." }, { status: 400 });
  if (password !== undefined && (typeof password !== "string" || password.length < 12 || password.length > 200)) return NextResponse.json({ error: "La clave nueva debe tener al menos 12 caracteres." }, { status: 400 });
  if (sectors !== undefined && !validSectors(sectors)) return NextResponse.json({ error: "Seleccioná sectores válidos." }, { status: 400 });
  if (active !== undefined && typeof active !== "boolean") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  try {
    const account = await prisma.staffAdmin.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: (name as string).trim() } : {}),
        ...(alias !== undefined ? { alias: (alias as string).trim().toLowerCase() } : {}),
        ...(password !== undefined ? { passwordHash: hashPassword(password as string) } : {}),
        ...(sectors !== undefined ? { sectors: sectors as string[] } : {}),
        ...(active !== undefined ? { active } : {})
      }
    });
    return NextResponse.json({ account: publicAccount(account) });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ya existe una cuenta con ese alias." }, { status: 409 });
    console.error("Could not update sector admin", error);
    return NextResponse.json({ error: "No se pudo guardar la cuenta." }, { status: 500 });
  }
}
