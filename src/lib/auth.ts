export const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "DOOR", "BAR", "CASHIER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADMIN_SECTORS = ["DASHBOARD", "RESERVATIONS", "PAYMENTS", "PRODUCTS", "QR", "INCIDENTS", "DOOR", "BAR", "CASHIER"] as const;
export type AdminSector = (typeof ADMIN_SECTORS)[number];

export type AdminSession = {
  sub: string;
  name: string;
  sectors: AdminSector[];
  exp: number;
};

const roleSecrets: Partial<Record<StaffRole, string | undefined>> = {
  SUPERADMIN: process.env.ADMIN_ACCESS_TOKEN,
  DOOR: process.env.DOOR_ACCESS_TOKEN,
  BAR: process.env.BAR_ACCESS_TOKEN,
  CASHIER: process.env.CASHIER_ACCESS_TOKEN
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.includes(value as StaffRole);
}

export function isAdminSector(value: unknown): value is AdminSector {
  return typeof value === "string" && ADMIN_SECTORS.includes(value as AdminSector);
}

export function getConfiguredRoleToken(role: StaffRole) {
  const secret = roleSecrets[role];
  const minimumLength = role === "SUPERADMIN" ? 1 : 24;
  const isPlaceholder = secret?.startsWith("replace-with-") || secret === "change-this-to-a-long-random-secret";
  if (!secret || secret.length < minimumLength || (role !== "SUPERADMIN" && isPlaceholder)) {
    return null;
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey() {
  const secret = getConfiguredRoleToken("SUPERADMIN");
  if (!secret) return null;
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createAdminSessionToken(session: Omit<AdminSession, "exp">) {
  const key = await signingKey();
  if (!key) throw new Error("La llave maestra no está configurada correctamente.");
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ ...session, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 })));
  const signature = bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
  return `admin.${payload}.${signature}`;
}

export async function getAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  const [, payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const key = await signingKey();
    if (!key) return null;
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), new TextEncoder().encode(payload));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as AdminSession;
    if (typeof session.sub !== "string" || typeof session.name !== "string" || !Array.isArray(session.sectors) || session.exp <= Date.now() / 1000) return null;
    if (!session.sectors.every(isAdminSector)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function roleMatchesToken(role: string | undefined, token: string | undefined) {
  if (!isStaffRole(role) || !token) return false;
  if (role === "ADMIN") return Boolean(await getAdminSession(token));
  const expected = getConfiguredRoleToken(role);
  return Boolean(expected && expected === token);
}

export async function roleHasSector(role: string | undefined, token: string | undefined, sector: AdminSector) {
  if (role === "SUPERADMIN") return roleMatchesToken(role, token);
  if (role !== "ADMIN") return false;
  const session = await getAdminSession(token);
  return Boolean(session?.sectors.includes(sector));
}
