import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const reasonLabels: Record<string, string> = {
  CAPACITY_REACHED: "Aforo completo",
  MISSING_ID: "Falta de DNI",
  DRESS_CODE: "Incumplimiento del dress code publicado",
  SAFETY_CONCERN: "Protocolo objetivo de seguridad",
  CONDUCT: "Conducta documentada",
  OTHER_OBJECTIVE_REASON: "Otro motivo objetivo"
};

export default async function IncidentsPage() {
  const incidents = await prisma.admissionIncident.findMany({
    include: { reservation: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return (
    <section>
      <h2 className="text-2xl font-black">Incidencias de puerta</h2>
      <p className="mb-5 mt-2 text-sm text-muted">Registro operativo auditable. No se generan bloqueos automáticos ni perfiles de admisión.</p>
      {incidents.length ? (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded-2xl bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="font-bold">{reasonLabels[incident.reason] ?? incident.reason}</h3>
                <time className="text-sm text-muted">{formatDate(incident.createdAt)}</time>
              </div>
              <p className="mt-2 text-sm text-muted">Operador: {incident.operatorRole}{incident.reservation?.fullName ? ` · Reserva: ${incident.reservation.fullName}` : ""}</p>
              {incident.details && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-paper p-3 text-sm">{incident.details}</p>}
            </article>
          ))}
        </div>
      ) : <p className="rounded-2xl bg-white p-8 text-center text-muted">Todavía no hay incidencias registradas.</p>}
    </section>
  );
}
