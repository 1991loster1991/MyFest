import { prisma } from "@/lib/prisma";
import { SolicitudCard } from "@/components/admin/SolicitudCard";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const [pending, history] = await Promise.all([
    prisma.reservation.findMany({ where: { status: "PENDING" }, include: { guests: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "asc" } }),
    prisma.reservation.findMany({ where: { status: { not: "PENDING" } }, include: { guests: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } })
  ]);
  const reservations = [...pending, ...history];
  const renderReservation = (reservation: (typeof reservations)[number]) => (
    <SolicitudCard key={reservation.id} paymentAlias={process.env.PAYMENT_ALIAS ?? ""} attendees={[
      { role: "Titular", fullName: reservation.fullName, dni: reservation.dni, birthDate: reservation.birthDate?.toISOString() ?? null, checkedInAt: reservation.checkedInAt?.toISOString() ?? null, wristbandCode: reservation.wristbandCode },
      ...reservation.guests.map((guest, index) => ({ role: `Acompañante ${index + 1}`, fullName: guest.fullName, dni: guest.dni, birthDate: guest.birthDate.toISOString(), checkedInAt: guest.checkedInAt?.toISOString() ?? null, wristbandCode: guest.wristbandCode }))
    ]} reservation={{
      ...reservation,
      birthDate: reservation.birthDate?.toISOString().slice(0, 10) ?? null,
      createdAt: reservation.createdAt.toISOString(),
      checkedInAt: reservation.checkedInAt?.toISOString() ?? null
    }} />
  );
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><h2 className="text-2xl font-black">Solicitudes</h2><p className="mt-1 text-sm text-muted">{pending.length} pendientes · {reservations.length} en total</p></div>
      </div>
      {reservations.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-muted">Todavía no hay solicitudes.</div>
      ) : (
        <>
          <section aria-labelledby="pending-requests-heading">
            <h3 id="pending-requests-heading" className="mb-3 text-lg font-bold">Pendientes de decisión ({pending.length})</h3>
            {pending.length ? <div className="space-y-4">{pending.map(renderReservation)}</div> : <p className="rounded-2xl bg-white p-5 text-sm text-muted">No hay solicitudes para aprobar o rechazar.</p>}
          </section>
          {history.length > 0 && <section className="mt-8" aria-labelledby="request-history-heading">
            <h3 id="request-history-heading" className="mb-3 text-lg font-bold">Historial ({history.length})</h3>
            <div className="space-y-4">{history.map(renderReservation)}</div>
          </section>}
        </>
      )}
    </section>
  );
}
