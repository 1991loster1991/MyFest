import WelcomeExperience from "./WelcomeExperience";

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams
}: {
  searchParams: Promise<{ reserva?: string | string[]; destino?: string | string[] }>;
}) {
  const { reserva, destino } = await searchParams;
  const reservationId = Array.isArray(reserva) ? reserva[0] : reserva;
  const destinationParam = Array.isArray(destino) ? destino[0] : destino;
  const destination = reservationId
    ? `/reserva/${encodeURIComponent(reservationId)}`
    : destinationParam === "pre-reserva" ? "/pre-reserva" : "/";

  return <WelcomeExperience destination={destination} />;
}
