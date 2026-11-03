import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleMatchesToken } from "@/lib/auth";
import { QrCustomerManager } from "@/components/admin/QrCustomerManager";

export const dynamic = "force-dynamic";

export default async function CustomerQrPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("mauifest_role")?.value;
  const token = cookieStore.get("mauifest_staff_token")?.value;
  // Solo el superadministrador puede habilitar o bloquear un QR fuera de los sectores.
  if (role !== "SUPERADMIN" || !(await roleMatchesToken(role, token)))
    redirect("/admin/login?next=%2Fadmin%2Fqr-clientes");

  return (
    <section>
      <p className="text-xs font-bold tracking-[0.18em] text-muted">
        MAUI FEST / SUPERADMIN
      </p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">QR de clientes</h2>
      <p className="mb-6 mt-2 max-w-2xl text-sm leading-6 text-muted">
        Cada cliente conserva su QR único entre eventos. Acá podés consultarlo,
        ver su historial y activarlo o desactivarlo en cualquier momento.
      </p>
      <QrCustomerManager />
    </section>
  );
}
