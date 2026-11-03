import { z } from "zod";

function validDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isAdultOnDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validDateString(value)) return false;
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const today = Object.fromEntries(todayParts.map(({ type, value: part }) => [type, part]));
  const [birthYear, birthMonth, birthDay] = value.split("-").map(Number);
  const year = Number(today.year);
  const month = Number(today.month);
  const day = Number(today.day);
  const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
  return age >= 18;
}

const birthDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresá una fecha válida")
  .refine(validDateString, "Ingresá una fecha válida")
  .refine((value) => isAdultOnDate(value), "El evento es solo para mayores de 18 años.");

const dniSchema = z.string()
  .trim()
  .min(6, "El DNI debe tener al menos 6 caracteres")
  .max(20)
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{6,10}$/, "El DNI debe contener entre 6 y 10 números"));

const companionSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresá el nombre completo del acompañante").max(100),
  dni: dniSchema,
  birthDate: birthDateSchema
});

export const reservationSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresá tu nombre completo").max(100),
  email: z.preprocess(
    (value) => value == null ? "" : value,
    z.union([z.string().trim().email("Ingresá un email válido").max(254), z.literal("")])
  ),
  dni: dniSchema,
  birthDate: birthDateSchema,
  phone: z.string().trim().min(8, "Ingresá un teléfono válido").max(30),
  partySize: z.coerce.number().int().min(1).max(10),
  entryProductId: z.string().min(1, "Seleccioná un tipo de entrada"),
  guests: z.array(companionSchema).max(9),
  notes: z.string().trim().max(500).optional()
}).superRefine((data, context) => {
  if (data.guests.length !== data.partySize - 1) {
    context.addIssue({ code: "custom", path: ["guests"], message: "Completá nombre, DNI y fecha de nacimiento de cada acompañante." });
  }
  const dniValues = [data.dni, ...data.guests.map((guest) => guest.dni)];
  if (new Set(dniValues).size !== dniValues.length) {
    context.addIssue({ code: "custom", path: ["guests"], message: "Cada persona debe tener un DNI distinto." });
  }
});

export const evaluateSchema = z.object({
  reservationId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"])
});

export const checkinSchema = z.object({
  reservationId: z.string().min(1).optional(),
  dni: dniSchema.optional(),
  confirm: z.boolean().optional()
}).refine((data) => Boolean(data.reservationId || data.dni), "Ingresá el código o DNI.");

export const paymentSubmissionSchema = z.object({
  paymentReference: z.string().trim().min(4, "Ingresá el número o referencia de la transferencia").max(100)
});

export const drinkOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  paymentReference: z.string().trim().min(4).max(100)
});

export const paymentReviewSchema = z.object({
  reservationId: z.string().optional(),
  orderId: z.string().optional(),
  decision: z.enum(["PAID", "REJECTED"])
}).refine((data) => Boolean(data.reservationId) !== Boolean(data.orderId), "Indicá una reserva o pedido.");

export const catalogUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional(),
  priceCents: z.coerce.number().int().min(0).max(100000000),
  active: z.boolean()
});

export const incidentSchema = z.object({
  reservationId: z.string().optional(),
  reason: z.enum(["CAPACITY_REACHED", "MISSING_ID", "DRESS_CODE", "SAFETY_CONCERN", "CONDUCT", "OTHER_OBJECTIVE_REASON"]),
  details: z.string().trim().max(500).optional()
});

export const wristbandSchema = z.object({
  reservationId: z.string().min(1),
  wristbandCode: z.string().trim().min(3).max(80)
});

export const cashierSaleSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(254),
  dni: dniSchema,
  birthDate: birthDateSchema,
  phone: z.string().trim().min(8).max(30),
  partySize: z.coerce.number().int().min(1).max(1),
  entryProductId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"])
});

export const deliverSchema = z.object({
  orderId: z.string().min(1)
});

export const orderSchema = z.object({
  dni: dniSchema,
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  paymentMethod: z.enum(["CASH", "TRANSFER"])
});
