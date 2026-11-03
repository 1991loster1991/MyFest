"use client";

import { useState } from "react";
import { Archive, CheckCircle2, ClipboardList, CreditCard, DoorOpen, LayoutGrid } from "lucide-react";
import { SolicitudCard } from "@/components/admin/SolicitudCard";
import type { ReservationSummary } from "@/types";

type Attendee = {
  role: string;
  fullName: string;
  dni: string;
  birthDate: string | null;
  checkedInAt: string | null;
  wristbandCode: string | null;
  qrCode: string | null;
};

type RequestItem = {
  reservation: ReservationSummary;
  attendees: Attendee[];
};

type RequestSection = {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: "pending" | "payment" | "door" | "approved" | "rejected";
  items: RequestItem[];
};

const icons = {
  pending: ClipboardList,
  payment: CreditCard,
  door: DoorOpen,
  approved: CheckCircle2,
  rejected: Archive
};

export function SolicitudSections({ sections, paymentAlias }: { sections: RequestSection[]; paymentAlias: string }) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const allCount = sections.reduce((total, section) => total + section.items.length, 0);
  const visibleSections = selectedSection === "all"
    ? sections
    : sections.filter((section) => section.id === selectedSection);

  return (
    <>
      <nav aria-label="Acceso rápido a solicitudes por estado" className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ id, title, description, color, icon, items }) => {
          const Icon = icons[icon];
          const selected = selectedSection === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedSection(id)}
              className={`group rounded-2xl border bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selected ? "border-ink ring-2 ring-ink/10" : "border-black/5"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${color}`}><Icon size={20} aria-hidden="true" /></span>
                <span className="text-2xl font-black">{items.length}</span>
              </div>
              <span className="mt-4 block font-bold group-hover:underline">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selectedSection === "all"}
          onClick={() => setSelectedSection("all")}
          className={`group rounded-2xl border bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selectedSection === "all" ? "border-ink ring-2 ring-ink/10" : "border-black/5"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700"><LayoutGrid size={20} aria-hidden="true" /></span>
            <span className="text-2xl font-black">{allCount}</span>
          </div>
          <span className="mt-4 block font-bold group-hover:underline">Ver todo</span>
          <span className="mt-1 block text-xs leading-5 text-muted">Mostrar todas las categorías y solicitudes.</span>
        </button>
      </nav>

      <div aria-live="polite" className="space-y-8">
        {selectedSection === null ? (
          <p className="rounded-2xl border border-dashed border-black/10 bg-white/70 p-6 text-center text-sm text-muted">
            Elegí un acceso directo para ver sus solicitudes.
          </p>
        ) : visibleSections.map(({ id, title, description, items }) => (
          <section key={id} aria-labelledby={`${id}-heading`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`${id}-heading`} className="text-lg font-bold">{title} <span className="text-muted">({items.length})</span></h3>
              <p className="text-xs text-muted">{description}</p>
            </div>
            {items.length > 0
              ? <div className="space-y-4">{items.map(({ reservation, attendees }) => (
                <SolicitudCard key={reservation.id} reservation={reservation} attendees={attendees} paymentAlias={paymentAlias} />
              ))}</div>
              : <p className="rounded-2xl border border-dashed border-black/10 bg-white/70 p-5 text-sm text-muted">No hay solicitudes en esta etapa.</p>}
          </section>
        ))}
      </div>
    </>
  );
}
