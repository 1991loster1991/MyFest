"use client";

import { Input } from "@/components/ui/Input";

export function DniScanner({ value, onChange, label = "DNI del invitado", placeholder = "Ingresá el DNI" }: { value: string; onChange: (dni: string) => void; label?: string; placeholder?: string }) {
  return (
    <Input
      label={label}
      name="dni-lookup"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      inputMode="numeric"
      placeholder={placeholder}
    />
  );
}
