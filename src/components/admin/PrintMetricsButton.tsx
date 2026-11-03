"use client";

import { Button } from "@/components/ui/Button";

export function PrintMetricsButton() {
  return <Button type="button" variant="secondary" className="dashboard-no-print" onClick={() => window.print()}>Exportar métricas a PDF</Button>;
}
