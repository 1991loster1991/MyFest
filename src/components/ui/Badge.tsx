import { cn, formatStatus } from "@/lib/utils";

export function Badge({ status, label }: { status: string; label?: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    PENDING_PAYMENT: "bg-sky-100 text-sky-900",
    PAYMENT_REVIEW: "bg-amber-100 text-amber-900",
    APPROVED: "bg-lime text-ink",
    ACTIVATED: "bg-emerald-100 text-emerald-900",
    REJECTED: "bg-red-100 text-red-800",
    CHECKED_IN: "bg-blue-100 text-blue-800",
    ADMITTED: "bg-blue-100 text-blue-800",
    DELIVERED: "bg-neutral-200 text-neutral-700"
  };
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", styles[status] ?? "bg-neutral-100")}>
      {label ?? formatStatus(status)}
    </span>
  );
}
