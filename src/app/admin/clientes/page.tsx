import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleHasSector, roleMatchesToken } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { CustomerDirectory, type CustomerRecord } from "@/components/admin/CustomerDirectory";

export const dynamic = "force-dynamic";

function birthDateLabel(value: Date | null) {
  return value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(value) : "";
}

export default async function CustomersPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("mauifest_role")?.value;
  const token = cookieStore.get("mauifest_staff_token")?.value;
  const authorized = role === "SUPERADMIN"
    ? await roleMatchesToken(role, token)
    : await roleHasSector(role, token, "RESERVATIONS");
  if (!authorized) redirect("/admin/login?next=%2Fadmin%2Fclientes");

  const [reservations, periods] = await Promise.all([
    prisma.reservation.findMany({
      include: {
        guests: true,
        orders: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.eventPeriod.findMany({ orderBy: { startedAt: "desc" } })
  ]);

  const records = new Map<string, CustomerRecord>();
  const attendance = new Set<string>();
  const fallbackEventId = (at: Date) => `day-${new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(at)}`;
  const eventFor = (at: Date) => periods.find((period) => period.startedAt <= at && (!period.endedAt || period.endedAt > at));
  const addAttendee = (input: {
    name: string;
    dni: string;
    birthDate: Date | null;
    email: string;
    phone: string;
    registrationType: "Titular" | "Acompañante";
    contactName: string;
    reservationId: string;
    checkedInAt: Date | null;
  }) => {
    const dni = input.dni.trim();
    const existing = records.get(dni);
    const customer = existing ?? {
      name: input.name,
      dni,
      birthDate: birthDateLabel(input.birthDate),
      email: input.email,
      phone: input.phone,
      registrationType: input.registrationType,
      contactName: input.contactName,
      reservations: 0,
      attendances: [],
      purchases: []
    };
    customer.reservations += 1;
    if (input.checkedInAt) {
      const period = eventFor(input.checkedInAt);
      const eventId = period?.id ?? fallbackEventId(input.checkedInAt);
      const eventName = period?.name ?? `Evento · ${new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(input.checkedInAt)}`;
      const key = `${dni}:${eventId}`;
      if (!attendance.has(key)) {
        const item = { event: eventName, date: formatDate(input.checkedInAt).split(",")[0], time: new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(input.checkedInAt) };
        attendance.add(key);
        customer.attendances.push(item);
      }
    }
    records.set(dni, customer);
    return customer;
  };

  for (const reservation of reservations) {
    const owner = addAttendee({
      name: reservation.fullName,
      dni: reservation.dni,
      birthDate: reservation.birthDate,
      email: reservation.email,
      phone: reservation.phone,
      registrationType: "Titular",
      contactName: reservation.fullName,
      reservationId: reservation.id,
      checkedInAt: reservation.checkedInAt
    });
    for (const order of reservation.orders) {
      owner.purchases.push({
        item: order.itemName,
        quantity: order.quantity,
        date: formatDate(order.deliveredAt ?? order.createdAt),
        status: order.status === "DELIVERED" ? "Entregada" : order.paymentStatus === "PAID" ? "Pagada, pendiente de entrega" : "Pago pendiente"
      });
    }
    for (const guest of reservation.guests) {
      addAttendee({
        name: guest.fullName,
        dni: guest.dni,
        birthDate: guest.birthDate,
        email: "",
        phone: "",
        registrationType: "Acompañante",
        contactName: reservation.fullName,
        reservationId: reservation.id,
        checkedInAt: guest.checkedInAt
      });
    }
  }

  const customers = [...records.values()].sort((a, b) => a.name.localeCompare(b.name, "es-AR"));
  return (
    <section>
      <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUI FEST / CLIENTES</p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">Personas registradas</h2>
      <p className="mb-6 mt-2 max-w-3xl text-sm leading-6 text-muted">Consultá los datos de titulares y acompañantes, sus asistencias por fiesta con día y hora, y las consumiciones registradas bajo cada reserva.</p>
      <CustomerDirectory customers={customers} />
    </section>
  );
}
