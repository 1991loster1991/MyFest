import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { PaymentReferenceForm } from "@/components/forms/PaymentReferenceForm";
import { DrinkPurchaseForm } from "@/components/forms/DrinkPurchaseForm";
import { formatMoney } from "@/lib/utils";
import { AttendeeIdentityList } from "@/components/ui/AttendeeIdentityList";

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
          <Badge status={reservation.status} />
        </div>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          {reservation.status === "PENDING" && "Recibimos tu solicitud. El equipo del evento la está revisando."}
          {reservation.status === "APPROVED" && reservation.paymentStatus !== "PAID" && "Tu solicitud fue aprobada. El ingreso se confirma cuando el equipo verifique el pago."}
          {reservation.status === "APPROVED" && reservation.paymentStatus === "PAID" && "¡Tu entrada está confirmada! Presentá el código en la puerta."}
          {reservation.status === "REJECTED" && "Esta solicitud no pudo ser confirmada. Si necesitás ayuda, contactá al equipo del evento."}
          {reservation.status === "CHECKED_IN" && "Tu ingreso ya fue registrado. ¡Que disfrutes el evento!"}
        </p>
        <AttendeeIdentityList attendees={[
          { role: "Titular", fullName: reservation.fullName, dni: reservation.dni, birthDate: reservation.birthDate?.toISOString() ?? null, checkedInAt: reservation.checkedInAt?.toISOString() ?? null, wristbandCode: reservation.wristbandCode },
          ...reservation.guests.map((guest, index) => ({ role: `Acompañante ${index + 1}`, fullName: guest.fullName, dni: guest.dni, birthDate: guest.birthDate.toISOString(), checkedInAt: guest.checkedInAt?.toISOString() ?? null, wristbandCode: guest.wristbandCode }))
        ]} partySize={reservation.partySize} />
        {reservation.status === "APPROVED" && (reservation.paymentStatus === "PENDING" || reservation.paymentStatus === "REJECTED") && (
          <div className="mt-7 rounded-2xl bg-paper p-5">
            <h2 className="text-lg font-bold">Entrada: {reservation.entryProductName}</h2>
            <p className="mt-2 text-sm text-muted">{reservation.partySize} × {formatMoney(reservation.entryPriceCents)} = {formatMoney(reservation.entryPriceCents * reservation.partySize)}</p>
            {reservation.paymentStatus === "REJECTED" && <p className="mt-2 text-sm text-red-800">La referencia anterior no pudo verificarse. Podés informar una nueva transferencia.</p>}
            <PaymentReferenceForm
              endpoint={`/api/reserva/${reservation.id}/payment`}
              alias={process.env.PAYMENT_ALIAS ?? ""}
              amount={reservation.entryPriceCents * reservation.partySize}
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
