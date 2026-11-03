"use client";

import { useState } from "react";

export function useScanner() {
  const [scannedValue, setScannedValue] = useState("");
  const [error, setError] = useState("");

  function accept(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      setError("El código está vacío.");
      return;
    }
    setError("");
    setScannedValue(normalized);
  }

  return { scannedValue, error, accept, reset: () => setScannedValue("") };
}
