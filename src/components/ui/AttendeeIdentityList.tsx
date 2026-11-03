"use client";

type AttendeeIdentity = {
  role: string;
  fullName: string;
  dni: string;
  birthDate: string | null;
  checkedInAt: string | null;
  wristbandCode: string | null;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

export function AttendeeIdentityList({ attendees, partySize }: { attendees: AttendeeIdentity[]; partySize: number }) {
  return (
    <section className="mt-5 rounded-xl bg-paper p-4" aria-label="Identidades individuales de la reserva">
      <h3 className="font-bold">Identidad y pulsera por persona</h3>
      <p className="mt-1 text-xs text-muted">Cada persona se valida con su propio DNI y recibe un código de pulsera único.</p>
      {attendees.length !== partySize && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">La reserva indica {partySize} personas, pero hay {attendees.length} identidades registradas. Completá los datos faltantes antes de habilitar el ingreso.</p>}
      <p className="mt-2 text-xs text-muted">{attendees.length} de {partySize} identidades cargadas</p>
      <ol className="mt-3 space-y-3">
        {attendees.map((attendee, index) => (
          <li key={`${attendee.dni}-${index}`} className="rounded-xl border border-black/5 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-semibold">{index + 1}. {attendee.fullName}</p><p className="mt-1 text-xs text-muted">{attendee.role} · DNI {attendee.dni}{attendee.birthDate ? ` · Nacimiento ${dateLabel(attendee.birthDate)}` : ""}</p></div>
              <span className={attendee.wristbandCode ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900" : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"}>{attendee.wristbandCode ? "Pulsera activada" : "Pendiente en puerta"}</span>
            </div>
            {attendee.checkedInAt && <p className="mt-2 text-xs text-muted">Ingresó: {dateTimeLabel(attendee.checkedInAt)}</p>}
            {attendee.wristbandCode && <p className="mt-2 break-all font-mono text-xs">ID único: {attendee.wristbandCode}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
