"use client";

import { Input } from "@/components/ui/Input";

export function DniScanner({ value, onChange }: { value: string; onChange: (dni: string) => void }) {
  return (
    <Input
      label="DNI del invitado"
      name="dni-lookup"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      inputMode="numeric"
      placeholder="Ingresá el DNI"
    />
  );
}
