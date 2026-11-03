import { clsx, type ClassValue } from "clsx";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

// Locale fijo (ar-AR) y zona fija: evita que el servidor y el navegador rendericen un texto distinto
// y disparen errores de hidratación en componentes cliente.
export function formatDate(date: Date | string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(value);
}

export function formatStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobada",
    ACTIVATED: "Activada",
    ADMITTED: "Ingresó",
    REJECTED: "Rechazada",
    CHECKED_IN: "Ingresó",
    DELIVERED: "Entregado"
  };
  return labels[status] ?? status;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(cents / 100);
}
