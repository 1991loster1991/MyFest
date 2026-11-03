import { cn, formatStatus } from "@/lib/utils";

export function Badge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-lime text-ink",
    REJECTED: "bg-red-100 text-red-800",
    CHECKED_IN: "bg-blue-100 text-blue-800",
    DELIVERED: "bg-neutral-200 text-neutral-700"
  };
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", styles[status] ?? "bg-neutral-100")}>
      {formatStatus(status)}
    </span>
  );
}
