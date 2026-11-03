import { prisma } from "@/lib/prisma";
import { WristbandQrList } from "@/components/admin/WristbandQrList";

export const dynamic = "force-dynamic";

export default async function WristbandsPage() {
  const period = await prisma.eventPeriod.findFirst({ where: { active: true }, orderBy: { startedAt: "desc" } });
  const createdAt = period ? { gte: period.startedAt } : undefined;
  const [reservations, companions] = await Promise.all([
    prisma.reservation.findMany({
      where: { ...(createdAt ? { createdAt } : {}), wristbandCode: { not: null }, checkedInAt: { not: null } },
      select: { id: true, fullName: true, dni: true, wristbandCode: true, checkedInAt: true }
    }),
    prisma.reservationGuest.findMany({
      where: { wristbandCode: { not: null }, checkedInAt: { not: null }, ...(createdAt ? { reservation: { createdAt } } : {}) },
      include: { reservation: { select: { id: true } } }
    })
  ]);
  const wristbands = [
    ...reservations.map((attendee) => ({ reservationId: attendee.id, name: attendee.fullName, dni: attendee.dni, code: attendee.wristbandCode!, checkedInAt: attendee.checkedInAt!.toISOString() })),
    ...companions.map((attendee) => ({ reservationId: attendee.reservation.id, name: attendee.fullName, dni: attendee.dni, code: attendee.wristbandCode!, checkedInAt: attendee.checkedInAt!.toISOString() }))
  ].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));

  return (
    <section>
      <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUI FEST / ACCESO</p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">QR de pulseras</h2>
      <p className="mb-6 mt-2 max-w-2xl text-sm leading-6 text-muted">Cada QR corresponde a una persona. El código se genera al validar su DNI en Puerta; imprimí esta lista para asociar cada código a su pulsera física.</p>
      <WristbandQrList wristbands={wristbands} eventName={period?.name ?? "Evento actual"} />
    </section>
  );
}
