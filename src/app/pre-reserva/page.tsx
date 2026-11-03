import Link from "next/link";
import { PreReservaForm } from "@/components/forms/PreReservaForm";

export default function PreReservaPage() {
  return (
    <div className="mx-auto max-w-[560px] px-4 py-7 sm:px-5 sm:py-8">
      <Link href="/" className="text-xs font-medium text-muted transition-colors hover:text-ink">← Volver al inicio</Link>
      <div className="mb-5 mt-5">
        <p className="text-[10px] font-bold tracking-[0.16em] text-muted">MAUI FEST / INVITADOS</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pedí tu lugar.</h1>
        <p className="mt-1 text-sm leading-5 text-muted">Dejanos tus datos. Te enviaremos un código para consultar el estado de la solicitud.</p>
      </div>
      <div className="rounded-[22px] border border-black/[0.04] bg-white p-5 shadow-card sm:p-6"><PreReservaForm /></div>
    </div>
  );
}
