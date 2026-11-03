import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-5 sm:pb-20 sm:pt-20">
      <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
        <section className="min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">
            <PartyPopper size={15} className="text-gold" aria-hidden="true" /> UNA NOCHE. TODOS CONECTADOS.
          </div>
          <h1 className="max-w-3xl text-[clamp(2.5rem,11vw,4.5rem)] font-black leading-[1.02] tracking-tight">
            Tu próxima noche <span className="text-neutral-400">empieza acá.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
            Una experiencia cuidada de principio a fin. Pedí tu pre-reserva y nuestro equipo te confirma disponibilidad.
          </p>
          <div className="mt-7 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
            <Link href="/pre-reserva"><Button>Solicitar pre-reserva <ArrowUpRight size={17} className="ml-2" /></Button></Link>
            <a href="#experiencia" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 px-5 text-sm font-semibold">
              Conocé cómo funciona <ArrowDownRight size={16} />
            </a>
          </div>
        </section>
        <aside className="relative min-h-[340px] min-w-0 overflow-hidden rounded-[2rem] bg-ink p-6 text-white sm:min-h-[440px] sm:p-10">
          <div className="absolute -right-10 -top-14 h-64 w-64 rounded-full bg-lime blur-[1px]" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-white/15" />
          <div className="relative flex h-full min-h-[300px] flex-col justify-between">
            <span className="text-sm text-white/60">MAUI FEST / EVENT SERIES</span>
            <div>
              <p className="mb-2 inline-block w-fit max-w-full whitespace-normal break-words rounded-md bg-ink/85 px-2 py-1 text-xs leading-5 text-white sm:text-sm">BUENOS AIRES · La Costa</p>
              <h2 className="max-w-xs text-4xl font-black leading-tight">La ciudad, de otra manera.</h2>
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">Música, encuentros y momentos que merecen quedarse.</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-white/15 pt-5">
              <span className="text-sm text-white/60">Acceso sujeto a aprobación</span>
              <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">EDICIÓN 01</span>
            </div>
          </div>
        </aside>
      </div>
      <section id="experiencia" className="mt-14 grid gap-3 sm:mt-20 sm:grid-cols-3 sm:gap-4">
        {[
          ["01", "Solicitá tu lugar", "Completá tus datos y enviá una pre-reserva en menos de un minuto."],
          ["02", "Recibí confirmación", "El equipo revisa cada solicitud y te comparte el estado de tu reserva."],
          ["03", "Entrá y disfrutá", "Presentá tu código en puerta. La pulsera habilita una experiencia simple."]
        ].map(([number, title, description]) => (
          <article key={number} className="min-w-0 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
            <span className="text-sm font-bold text-muted">{number} / 03</span>
            <h3 className="mt-8 text-xl font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
