import { prisma } from "@/lib/prisma";
import { PaymentReviewCard } from "@/components/admin/PaymentReviewCard";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [reservations, orders, receipts] = await Promise.all([
    prisma.reservation.findMany({ where: { status: "APPROVED", paymentStatus: "SUBMITTED" }, orderBy: { updatedAt: "asc" } }),
    prisma.barOrder.findMany({
      where: { paymentStatus: "SUBMITTED" },
      include: { reservation: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.reservationNotification.findMany({
      where: { kind: "PAYMENT_RECEIPT" },
      include: { reservation: { select: { fullName: true, entryProductName: true, partySize: true, entryPriceCents: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);
  const receiptByReservation = new Map<string, (typeof receipts)[number]>();
  for (const receipt of receipts) {
    if (!receiptByReservation.has(receipt.reservationId)) receiptByReservation.set(receipt.reservationId, receipt);
  }
  const payments = [
    ...reservations.map((reservation) => {
      const receipt = receiptByReservation.get(reservation.id);
      return {
        id: reservation.id,
        kind: "ENTRY" as const,
        buyerName: reservation.fullName,
        buyerEmail: reservation.email,
        description: `${reservation.entryProductName} × ${reservation.partySize}`,
        quantity: reservation.partySize,
        totalCents: reservation.entryPriceCents * reservation.partySize,
        reference: reservation.paymentReference ?? "",
        reservationId: reservation.id,
        receipt: receipt?.attachmentUrl ? { url: receipt.attachmentUrl, name: receipt.attachmentName ?? "comprobante", createdAt: receipt.createdAt.toISOString(), emailSent: receipt.emailSent, emailError: receipt.emailError } : null
      };
    }),
    ...orders.map((order) => ({
      id: order.id,
      kind: "DRINK" as const,
      buyerName: order.reservation.fullName,
      buyerEmail: order.reservation.email,
      description: `${order.itemName} × ${order.quantity}`,
      quantity: order.quantity,
      totalCents: order.unitPriceCents * order.quantity,
      reference: order.paymentReference ?? "",
      reservationId: order.reservationId,
      receipt: null
    }))
  ];
  return (
    <section>
      <h2 className="text-2xl font-black">Verificación de pagos</h2>
      <p className="mb-5 mt-2 text-sm text-muted">Contrastá cada referencia con la cuenta bancaria antes de confirmar. La verificación no es automática.</p>
      {payments.length ? (
        <div className="space-y-4">{payments.map((payment) => (
          <PaymentReviewCard key={`${payment.kind}-${payment.id}`} payment={payment} />
        ))}</div>
      ) : <p className="rounded-2xl bg-white p-8 text-center text-muted">No hay pagos para revisar.</p>}
    </section>
  );
}
