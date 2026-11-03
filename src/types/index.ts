export type ReservationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_IN";
export type OrderStatus = "PENDING" | "DELIVERED";
export type PaymentStatus = "PENDING" | "SUBMITTED" | "PAID" | "REJECTED";

export interface ReservationSummary {
  id: string;
  fullName: string;
  email: string;
  dni: string;
  birthDate: string | null;
  phone: string;
  partySize: number;
  notes: string | null;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  wristbandCode: string | null;
  checkedInAt: string | null;
  createdAt: string;
}

export interface BarOrderSummary {
  id: string;
  reservationId: string;
  guestName: string;
  itemName: string;
  quantity: number;
  status: OrderStatus;
  createdAt: string;
}
