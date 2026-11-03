import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function Input({ label, className, id, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label className="block min-w-0 space-y-2 text-sm font-medium text-ink" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        className={cn(
          "min-h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-base outline-none transition placeholder:text-neutral-400 focus:border-ink",
          className
        )}
        {...props}
      />
    </label>
  );
}
