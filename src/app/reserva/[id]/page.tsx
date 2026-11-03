import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { PaymentReferenceForm } from "@/components/forms/PaymentReferenceForm";
import { DrinkPurchaseForm } from "@/components/forms/DrinkPurchaseForm";
import { formatDate, formatMoney } from "@/lib/utils";
import { AttendeeIdentityList } from "@/components/ui/AttendeeIdentityList";
import { currentEventLoads } from "@/lib/event-loads";
import { customerStage, STAGE_LABELS, shouldResetReservation, stageMessage } from "@/lib/customer-status";
import { eventDetailsFor } from "@/lib/notifications";
import { ReservationStatusNotifications } from "@/components/ui/ReservationStatusNotifications";

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } }, guests: { orderBy: { createdAt: "asc" } } }
  });
  const drinks = await prisma.catalogProduct.findMany({
    where: { type: "DRINK", active: true },
    orderBy: { name: "asc" }
  });
  if (!reservation) notFound();
  // Las cargas del evento guardan el QR permanente de cada persona y la consumición a retirar.
  const loads = await currentEventLoads(reservation.id);
  const pendingLoads = loads.filter((load) => !load.deactivatedAt && load.accessStatus !== "DELIVERED");
  const deliveredLoads = loads.filter((load) => Boolean(load.deliveredAt));
  // Estado visible: Pendiente → Abonando → Aprobado → En cola (día del evento) → Ingresado.
  const eventInfo = await eventDetailsFor(reservation.entryProductName);
  const stage = customerStage({ status: reservation.status, paymentStatus: reservation.paymentStatus, eventDate: eventInfo.eventDate });
  // Después de las 06:00 del día siguiente al evento el estado se limpia.
  const expired = shouldResetReservation({ status: reservation.status, eventDate: eventInfo.eventDate });

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;
  const entryUrl = new URL("/ingresar", siteOrigin);
  entryUrl.searchParams.set("reserva", reservation.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-9 sm:px-5 sm:py-16">
      <Link href="/" className="text-sm font-semibold text-muted hover:text-ink">← Volver al inicio</Link>
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card sm:mt-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-muted">ESTADO DE TU SOLICITUD</p>
            <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">{reservation.fullName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ReservationStatusNotifications reservationId={reservation.id} initialStatus={reservation.status} />
            <Badge status={stage} label={STAGE_LABELS[stage]} />
          </div>
        </div>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          {expired
            ? "Este evento ya finalizó y tu solicitud quedó archivada. El equipo habilitará las inscripciones del próximo evento."
            : stageMessage(stage, { fullName: reservation.fullName, partySize: reservation.partySize, entryProductName: reservation.entryProductName, totalCents: reservation.entryPriceCents * reservation.partySize })}
        </p>
        {expired && (
          <Link href="/pre-reserva" className="mt-4 inline-flex rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white">Volver al formulario</Link>
        )}
        <AttendeeIdentityList attendees={[
          { role: "Titular", fullName: reservation.fullName, dni: reservation.dni, birthDate: reservation.birthDate?.toISOString() ?? null, checkedInAt: reservation.checkedInAt?.toISOString() ?? null, wristbandCode: reservation.wristbandCode, qrCode: reservation.qrCode },
          ...reservation.guests.map((guest, index) => ({ role: `Acompañante ${index + 1}`, fullName: guest.fullName, dni: guest.dni, birthDate: guest.birthDate.toISOString(), checkedInAt: guest.checkedInAt?.toISOString() ?? null, wristbandCode: guest.wristbandCode, qrCode: guest.qrCode }))
        ]} partySize={reservation.partySize} reservationStatus={reservation.status} showStatus={false} />
        {(reservation.status === "ACTIVATED" || reservation.status === "CHECKED_IN") && pendingLoads.length > 0 && (
          <section className="mt-7 rounded-2xl border border-emerald-900/10 bg-emerald-50 p-5" aria-label="Códigos QR de acceso">
            <h2 className="text-lg font-bold">Tu acceso al evento</h2>
            <p className="mt-1 text-sm text-emerald-900">Cada persona presenta su QR único junto con su DNI. Aclaramos que deberán concurrir con DNI en mano y vestimenta acorde; prohibido ropa deportiva.</p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {pendingLoads.map((load) => (
                <li key={load.id} className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center">
                  <ClientQRCode value={load.qrCode} size={144} level="H" />
                  <p className="font-semibold">{load.personName}</p>
                  <p className="break-all font-mono text-[11px] text-muted">{load.qrCode}</p>
                  {load.consumptionItem && <p className="text-xs text-muted">Consumición a retirar en barra: <strong>{load.consumptionItem}</strong></p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {deliveredLoads.length > 0 && (
          <section className="mt-5 rounded-2xl bg-paper p-5" aria-label="Consumiciones retiradas">
            <h2 className="text-lg font-bold">Ya retiró su consumición</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {deliveredLoads.map((load) => (
                <li key={load.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-white p-3">
                  <span>{load.personName}{load.consumptionItem ? ` · ${load.consumptionItem}` : ""}</span>
                  <span className="text-muted">Retirada: {formatDate(load.deliveredAt!)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">El QR de este evento dejó de mostrarse al confirmarse el retiro.</p>
          </section>
        )}
        {reservation.status === "APPROVED" && (reservation.paymentStatus === "PENDING" || reservation.paymentStatus === "REJECTED") && (
          <div className="mt-7 rounded-2xl bg-paper p-5">
            <h2 className="text-lg font-bold">Entrada: {reservation.entryProductName}</h2>
            <p className="mt-2 text-sm text-muted">{reservation.partySize} × {formatMoney(reservation.entryPriceCents)} = {formatMoney(reservation.entryPriceCents * reservation.partySize)}</p>
            {reservation.paymentStatus === "REJECTED" && <p className="mt-2 text-sm text-red-800">La referencia anterior no pudo verificarse. Podés informar una nueva transferencia.</p>}
            <PaymentReferenceForm
              endpoint={`/api/reserva/${reservation.id}/payment`}
              alias={process.env.PAYMENT_ALIAS ?? ""}
              amount={reservation.entryPriceCents * reservation.partySize}
              reservationId={reservation.id}
            />
          </div>
        )}
        {reservation.status === "APPROVED" && reservation.paymentStatus === "SUBMITTED" && (
          <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Recibimos la referencia del pago. El equipo la verificará antes de habilitar el ingreso.</p>
        )}
        {reservation.status === "APPROVED" && reservation.paymentStatus === "REJECTED" && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">No pudimos verificar el pago. Contactá al equipo para revisar la referencia.</p>
        )}
        {reservation.status === "APPROVED" && reservation.paymentStatus === "PAID" && (
          <div className="mt-8 grid min-w-0 gap-6 rounded-2xl bg-paper p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:p-7">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold"><QrCode size={18} /> Código de reserva</div>
            <p className="mt-3 break-all font-mono text-xs text-muted">{reservation.id}</p>
            <p className="mt-4 break-all text-sm text-muted">{reservation.partySize} {reservation.partySize === 1 ? "persona" : "personas"}{reservation.email ? ` · ${reservation.email}` : ""}</p>
          </div>
          <div className="w-fit max-w-full rounded-xl bg-white p-3">
            <ClientQRCode value={entryUrl.toString()} size={144} level="M" />
          </div>
          </div>
        )}
        {reservation.paymentStatus === "PAID" && reservation.status !== "REJECTED" && (
          <section className="mt-8">
            <h2 className="text-xl font-bold">Consumiciones</h2>
            {reservation.orders.length > 0 && (
              <ul className="mt-3 space-y-2">
                {reservation.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-paper p-3 text-sm">
                    <span>{order.itemName} × {order.quantity}</span>
                    <span>{order.paymentStatus === "PAID" ? "Pago verificado" : order.paymentStatus === "SUBMITTED" ? "Pago a verificar" : order.paymentStatus === "REJECTED" ? "Pago rechazado" : "Pendiente"}</span>
                  </li>
                ))}
              </ul>
            )}
            {reservation.status === "APPROVED" && <DrinkPurchaseForm reservationId={reservation.id} products={drinks} alias={process.env.PAYMENT_ALIAS ?? ""} />}
          </section>
        )}
        {reservation.wristbandCode && <p className="mt-5 text-sm">Pulsera vinculada: <strong>{reservation.wristbandCode}</strong></p>}
      </div>
    </div>
  );
}
