import Link from "next/link";
import { ArrowRight, ClipboardList, DoorOpen, GlassWater, KeyRound, QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/auth";
import { EventPeriodControls } from "@/components/admin/EventPeriodControls";
import { PrintMetricsButton } from "@/components/admin/PrintMetricsButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("mauifest_role")?.value;
  if (role === "ADMIN") {
    const session = await getAdminSession(cookieStore.get("mauifest_staff_token")?.value);
    const sectors = [
      ["RESERVATIONS", "Solicitudes", "/admin/solicitudes"],
      ["PAYMENTS", "Pagos", "/admin/pagos"],
      ["PRODUCTS", "Productos", "/admin/productos"],
      ["QR", "QR pre-reserva", "/admin/qr-ingreso"],
      ["INCIDENTS", "Incidencias", "/admin/incidencias"],
      ["DOOR", "Pulseras QR", "/admin/pulseras"],
      ["DOOR", "Puerta", "/puerta"],
      ["BAR", "Barra", "/barra"],
      ["CASHIER", "Caja", "/caja"]
    ] as const;
    const accessLinks = sectors.filter(([sector]) => session?.sectors.includes(sector));
    if (!session?.sectors.includes("DASHBOARD")) {
      return (
        <section>
          <p className="mb-5 text-muted">Hola {session?.name}. Estos son los sectores habilitados para tu cuenta.</p>
          {accessLinks.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accessLinks.map(([, label, href]) => <Link key={href} href={href} className="rounded-2xl border border-black/5 bg-white p-5 font-bold shadow-card transition hover:-translate-y-0.5">Abrir {label} <ArrowRight className="ml-2 inline" size={18} /></Link>)}
            </div>
          ) : <p className="rounded-2xl bg-white p-6 text-muted">Todavía no tenés sectores habilitados. Pedile acceso al superadministrador.</p>}
        </section>
      );
    }
  }

  let activePeriod = await prisma.eventPeriod.findFirst({ where: { active: true }, orderBy: { startedAt: "desc" } });
  if (!activePeriod) {
    const [firstReservation, firstOrder] = await Promise.all([
      prisma.reservation.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.barOrder.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } })
    ]);
    const firstRecordDate = [firstReservation?.createdAt, firstOrder?.createdAt].filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime())[0] ?? new Date();
    activePeriod = await prisma.eventPeriod.create({ data: { name: "Evento inicial", startedAt: firstRecordDate, active: true } });
  }
  const previousPeriods = role === "SUPERADMIN"
    ? await prisma.eventPeriod.findMany({ where: { active: false }, orderBy: { startedAt: "desc" }, take: 20 })
    : [];
  const eventDateFilter = { gte: activePeriod.startedAt, ...(activePeriod.endedAt ? { lte: activePeriod.endedAt } : {}) };

  const [pending, approved, checkedIn, orders, entryPayments, drinkPayments, paidEntries, paidDrinks] = await Promise.all([
    prisma.reservation.count({ where: { createdAt: eventDateFilter, status: "PENDING" } }),
    prisma.reservation.count({ where: { createdAt: eventDateFilter, status: "APPROVED", paymentStatus: "PAID" } }),
    prisma.reservation.findMany({ where: { createdAt: eventDateFilter, status: "CHECKED_IN" }, select: { partySize: true } }),
    prisma.barOrder.count({ where: { createdAt: eventDateFilter, status: "PENDING", paymentStatus: "PAID" } }),
    prisma.reservation.count({ where: { createdAt: eventDateFilter, paymentStatus: "SUBMITTED" } }),
    prisma.barOrder.count({ where: { createdAt: eventDateFilter, paymentStatus: "SUBMITTED" } }),
    prisma.reservation.findMany({ where: { createdAt: eventDateFilter, paymentStatus: "PAID" }, select: { partySize: true, entryPriceCents: true, paymentReference: true } }),
    prisma.barOrder.findMany({ where: { createdAt: eventDateFilter, paymentStatus: "PAID" }, select: { quantity: true, unitPriceCents: true } })
  ]);
  const checkedInPeople = checkedIn.reduce((sum, item) => sum + item.partySize, 0);
  const revenue = paidEntries.reduce((totals, entry) => {
    const total = entry.entryPriceCents * entry.partySize;
    if (entry.paymentReference?.startsWith("EFECTIVO · caja") || entry.paymentReference?.startsWith("TRANSFERENCIA · caja")) {
      totals.door += total;
    } else {
      totals.online += total;
    }
    return totals;
  }, { online: 0, door: 0 });
  const barRevenue = paidDrinks.reduce((sum, order) => sum + order.quantity * order.unitPriceCents, 0);
  const stats = [
    ["Solicitudes por revisar", pending, ClipboardList, "/admin/solicitudes"],
    ["Entradas confirmadas", approved, ArrowRight, "/admin/solicitudes"],
    ["Personas adentro", checkedInPeople, DoorOpen, "/admin/pulseras"],
    ["Pedidos de barra", orders, GlassWater, "/barra"],
    ["Pagos por verificar", entryPayments + drinkPayments, ClipboardList, "/admin/pagos"],
    ["Entradas online verificadas", formatMoney(revenue.online), ArrowRight, "/admin/pagos"],
    ["Ventas en puerta", formatMoney(revenue.door), DoorOpen, "/caja"],
    ["Consumiciones verificadas", formatMoney(barRevenue), GlassWater, "/barra"]
  ] as const;
  const reportDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  return (
    <section>
      <div className="dashboard-report">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Métricas del evento</h2>
            <p className="mt-1 text-sm text-muted">{activePeriod.name} · Informe del {reportDate}</p>
          </div>
          <PrintMetricsButton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(([label, count, Icon, href]) => (
            <Link key={label} href={href} className="rounded-2xl border border-black/5 bg-white p-5 shadow-card transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between text-muted"><span className="text-sm">{label}</span><Icon size={18} /></div>
              <p className="mt-6 text-4xl font-black">{count}</p>
            </Link>
          ))}
        </div>
      </div>
      {role === "SUPERADMIN" && <EventPeriodControls activePeriod={{ id: activePeriod.id, name: activePeriod.name, startedAt: activePeriod.startedAt.toISOString(), endedAt: activePeriod.endedAt?.toISOString() ?? null }} previousPeriods={previousPeriods.map((period) => ({ id: period.id, name: period.name, startedAt: period.startedAt.toISOString(), endedAt: period.endedAt?.toISOString() ?? null }))} />}
      <div className="dashboard-no-print mt-8 rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-lg font-bold">Operación</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Revisá solicitudes, validá códigos de acceso y gestioná los pedidos de barra desde las pantallas dedicadas.</p>
      </div>
      <Link href="/admin/clientes" className="dashboard-no-print mt-5 flex flex-col gap-2 rounded-2xl border border-gold/40 bg-white p-5 shadow-card transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold">Clientes registrados</h2><p className="mt-1 text-sm text-muted">Datos, consumiciones y asistencias con día y hora de ingreso.</p></div>
        <span className="font-semibold">Ver clientes <ArrowRight className="ml-1 inline" size={17} /></span>
      </Link>
      {role === "SUPERADMIN" && (
        <div className="dashboard-no-print mt-5 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/accesos" className="flex flex-col gap-3 rounded-2xl border border-gold/50 bg-white p-5 shadow-card transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 shrink-0 text-gold" size={22} />
              <div>
                <h2 className="font-bold">Administradores, accesos y contraseñas</h2>
                <p className="mt-1 text-sm text-muted">Crear cuentas, cambiar claves y asignar o quitar sectores.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 font-semibold">Gestionar <ArrowRight size={17} /></span>
          </Link>
          <Link href="/admin/pulseras" className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-card transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <QrCode className="mt-1 shrink-0 text-gold" size={22} />
              <div>
                <h2 className="font-bold">QR de pulseras</h2>
                <p className="mt-1 text-sm text-muted">Consultar e imprimir los IDs únicos activados en puerta.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 font-semibold">Abrir <ArrowRight size={17} /></span>
          </Link>
        </div>
      )}
    </section>
  );
}
