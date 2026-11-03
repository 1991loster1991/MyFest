import "dotenv/config";
import { randomInt } from "node:crypto";
import { CatalogType, PrismaClient, ReservationStatus, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();
const marker = "mauifest-demo-20261103";
const demoNote = `DEMO MAUI FEST ${marker}; registro ficticio para pruebas, borrar en Neon.`;

async function uniqueDni(reserved: Set<string>) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const dni = String(randomInt(900_000_000, 999_999_999));
    if (reserved.has(dni)) continue;
    const [reservation, guest] = await Promise.all([
      prisma.reservation.findUnique({ where: { dni }, select: { id: true } }),
      prisma.reservationGuest.findUnique({ where: { dni }, select: { id: true } })
    ]);
    if (!reservation && !guest) {
      reserved.add(dni);
      return dni;
    }
  }
  throw new Error("No se pudo reservar un DNI ficticio único.");
}

async function main() {
  const existing = await prisma.reservation.findFirst({ where: { email: { contains: marker } }, select: { id: true } });
  if (existing) {
    throw new Error(`Ya hay datos DEMO ${marker}. No se agregaron duplicados.`);
  }

  const [entryProduct, drinkProduct] = await Promise.all([
    prisma.catalogProduct.findFirst({ where: { type: CatalogType.ENTRY, active: true }, orderBy: { name: "asc" } }),
    prisma.catalogProduct.findFirst({ where: { type: CatalogType.DRINK, active: true }, orderBy: { name: "asc" } })
  ]);
  if (!entryProduct) throw new Error("No hay entradas activas para asociar a las reservas DEMO.");

  const reservedDnis = new Set<string>();
  const specs: Array<{
    key: string;
    label: string;
    status: ReservationStatus;
    paymentStatus: PaymentStatus;
    partySize?: number;
    paymentReference?: string;
  }> = [
    { key: "pre-pendiente-1", label: "Pre-reserva pendiente 1", status: "PENDING", paymentStatus: "PENDING", partySize: 2 },
    { key: "pre-pendiente-2", label: "Pre-reserva pendiente 2", status: "PENDING", paymentStatus: "PENDING" },
    { key: "pre-pendiente-3", label: "Pre-reserva pendiente 3", status: "PENDING", paymentStatus: "PENDING" },
    { key: "pago-entrada-1", label: "Pago entrada pendiente 1", status: "APPROVED", paymentStatus: "SUBMITTED", paymentReference: "DEMO-MF-TRANSFER-01" },
    { key: "pago-entrada-2", label: "Pago entrada pendiente 2", status: "APPROVED", paymentStatus: "SUBMITTED", paymentReference: "DEMO-MF-TRANSFER-02" },
    { key: "lista-puerta-1", label: "Entrada lista para puerta 1", status: "APPROVED", paymentStatus: "PAID" },
    { key: "lista-puerta-2", label: "Entrada lista para puerta 2", status: "APPROVED", paymentStatus: "PAID", partySize: 2 },
    { key: "ya-ingreso", label: "Invitado ya ingresado", status: "CHECKED_IN", paymentStatus: "PAID" },
    { key: "rechazada", label: "Solicitud rechazada de prueba", status: "REJECTED", paymentStatus: "REJECTED" }
  ];

  const created: Array<{ key: string; id: string }> = [];
  for (const [index, spec] of specs.entries()) {
    const partySize = spec.partySize ?? 1;
    const fullName = `DEMO · ${spec.label}`;
    const dni = await uniqueDni(reservedDnis);
    const guests = await Promise.all(Array.from({ length: partySize - 1 }, async (_, guestIndex) => ({
      fullName: `DEMO · Acompañante ${guestIndex + 1} de ${spec.label}`,
      dni: await uniqueDni(reservedDnis),
      birthDate: new Date("1994-06-15T00:00:00.000Z")
    })));
    const reservation = await prisma.reservation.create({
      data: {
        fullName,
        email: `demo+${marker}-${spec.key}@example.com`,
        dni,
        birthDate: new Date("1990-04-12T00:00:00.000Z"),
        phone: `+549110000${String(index + 1).padStart(4, "0")}`,
        partySize,
        notes: demoNote,
        status: spec.status,
        entryProductName: entryProduct.name,
        entryPriceCents: entryProduct.priceCents,
        paymentStatus: spec.paymentStatus,
        paymentReference: spec.paymentReference,
        wristbandCode: spec.status === "CHECKED_IN" ? `DEMO-MF-PULSERA-${marker}` : null,
        checkedInAt: spec.status === "CHECKED_IN" ? new Date() : null,
        guests: { create: guests }
      }
    });
    created.push({ key: spec.key, id: reservation.id });
  }

  if (drinkProduct) {
    const checkedIn = created.find((entry) => entry.key === "ya-ingreso");
    if (checkedIn) {
      await prisma.barOrder.createMany({
        data: [
          { reservationId: checkedIn.id, itemName: drinkProduct.name, quantity: 2, unitPriceCents: drinkProduct.priceCents, status: "PENDING", paymentStatus: "PAID", paymentReference: "DEMO-MF-BARRA-COBRADO" },
          { reservationId: checkedIn.id, itemName: drinkProduct.name, quantity: 1, unitPriceCents: drinkProduct.priceCents, status: "PENDING", paymentStatus: "SUBMITTED", paymentReference: "DEMO-MF-BARRA-TRANSFER" }
        ]
      });
    }
  }

  console.log(`Creados ${created.length} registros de reserva DEMO (${marker}):`);
  for (const entry of created) console.log(`${entry.key}: ${entry.id}`);
  console.log(`Pedidos DEMO de barra: ${drinkProduct ? 2 : 0}`);
  console.log(`Marcador para filtrar y borrar: ${marker}`);
}

main()
  .catch((error: unknown) => {
    console.error("No se pudieron cargar los datos DEMO:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
