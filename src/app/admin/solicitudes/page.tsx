import { prisma } from "@/lib/prisma";
import { SolicitudSections } from "@/components/admin/SolicitudSections";
import type { ReservationSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const reservations = await prisma.reservation.findMany({
    include: { guests: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" }
  });
  const requestItems = reservations.map((reservation) => ({
    reservation: {
      id: reservation.id,
      fullName: reservation.fullName,
      email: reservation.email,
      dni: reservation.dni,
      birthDate: reservation.birthDate?.toISOString().slice(0, 10) ?? null,
      phone: reservation.phone,
      partySize: reservation.partySize,
      notes: reservation.notes,
      entryProductName: reservation.entryProductName,
      entryPriceCents: reservation.entryPriceCents,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      wristbandCode: reservation.wristbandCode,
      qrCode: reservation.qrCode,
      checkedInAt: reservation.checkedInAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString()
    } satisfies ReservationSummary,
    attendees: [
      { role: "Titular", fullName: reservation.fullName, dni: reservation.dni, birthDate: reservation.birthDate?.toISOString() ?? null, checkedInAt: reservation.checkedInAt?.toISOString() ?? null, wristbandCode: reservation.wristbandCode, qrCode: reservation.qrCode },
      ...reservation.guests.map((guest, index) => ({ role: `Acompañante ${index + 1}`, fullName: guest.fullName, dni: guest.dni, birthDate: guest.birthDate.toISOString(), checkedInAt: guest.checkedInAt?.toISOString() ?? null, wristbandCode: guest.wristbandCode, qrCode: guest.qrCode }))
    ]
  }));
  const sections = [
    {
      id: "pending-requests",
      title: "Pendientes",
      description: "Solicitudes que necesitan aprobación o rechazo.",
      icon: "pending" as const,
      color: "border-amber-200 bg-amber-50 text-amber-800",
      items: requestItems.filter(({ reservation }) => reservation.status === "PENDING")
    },
    {
      id: "pending-payments",
      title: "Pendientes de pago",
      description: "Aprobadas que esperan el pago o su verificación.",
      icon: "payment" as const,
      color: "border-sky-200 bg-sky-50 text-sky-800",
      items: requestItems.filter(({ reservation }) => reservation.status === "APPROVED" && reservation.paymentStatus !== "PAID")
    },
    {
      id: "pending-door",
      title: "Pendientes en puerta",
      description: "Pago confirmado; falta activar el ingreso.",
      icon: "door" as const,
      color: "border-violet-200 bg-violet-50 text-violet-800",
      items: requestItems.filter(({ reservation }) => reservation.status === "APPROVED" && reservation.paymentStatus === "PAID")
    },
    {
      id: "approved",
      title: "Aprobados",
      description: "Reservas activadas o con el ingreso ya registrado.",
      icon: "approved" as const,
      color: "border-green-200 bg-green-50 text-green-800",
      items: requestItems.filter(({ reservation }) => reservation.status === "ACTIVATED" || reservation.status === "CHECKED_IN")
    },
    {
      id: "history",
      title: "Rechazados",
      description: "Solicitudes que no fueron aprobadas.",
      icon: "rejected" as const,
      color: "border-red-200 bg-red-50 text-red-800",
      items: requestItems.filter(({ reservation }) => reservation.status === "REJECTED")
    }
  ];

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-black">Solicitudes</h2>
        <p className="mt-1 text-sm text-muted">Acceso rápido por etapa de cada reserva · {reservations.length} en total</p>
      </div>
      <SolicitudSections sections={sections} paymentAlias={process.env.PAYMENT_ALIAS ?? ""} />
    </section>
  );
}
