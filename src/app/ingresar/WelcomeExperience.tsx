"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function seekToMusicStart(audio: HTMLAudioElement) {
  if (audio.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(audio.duration)) return;
  audio.currentTime = Math.min(10, Math.max(0, audio.duration - 0.25));
}

export default function WelcomeExperience({ destination }: { destination: string }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    async function startAudio(audioElement: HTMLAudioElement) {
      try {
        if (audioElement.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise<void>((resolve, reject) => {
            const onLoaded = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); reject(new Error("No se pudo cargar la pista.")); };
            const cleanup = () => {
              audioElement.removeEventListener("loadedmetadata", onLoaded);
              audioElement.removeEventListener("error", onError);
            };
            audioElement.addEventListener("loadedmetadata", onLoaded, { once: true });
            audioElement.addEventListener("error", onError, { once: true });
            audioElement.load();
          });
        }
        if (cancelled) return;
        seekToMusicStart(audioElement);
        audioElement.muted = false;
        await audioElement.play();
        if (!cancelled) {
          setMusicPlaying(true);
          setMusicMuted(false);
        }
      } catch {
        if (cancelled) return;
        audioElement.muted = true;
        try {
          seekToMusicStart(audioElement);
          await audioElement.play();
          if (!cancelled) {
            setMusicPlaying(true);
            setMusicMuted(true);
          }
        } catch {
          if (!cancelled) setMusicMuted(true);
        }
      }
    }
    void startAudio(audio);
    return () => {
      cancelled = true;
      audio.pause();
    };
  }, []);

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      seekToMusicStart(audio);
      audio.muted = false;
      void audio.play().then(() => {
        setMusicPlaying(true);
        setMusicMuted(false);
      }).catch(() => setMusicMuted(true));
      return;
    }
    audio.muted = !audio.muted;
    setMusicMuted(audio.muted);
  }

  function enter() {
    if (entering) return;
    setEntering(true);
    if (audioRef.current) {
      audioRef.current.muted = true;
      audioRef.current.pause();
      setMusicPlaying(false);
    }
    router.push(destination);
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center overflow-hidden bg-ink">
      <audio ref={audioRef} src="/audio/sabado-rebelde.mp3" loop preload="auto" playsInline />
      <Image
        src="/mauifest-logo.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={95}
        className="scale-110 object-cover opacity-60 blur-xl"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-ink/35" />

      <div className="relative aspect-square w-[min(100vw,100svh)] max-w-full shrink-0">
        <Image
          src="/mauifest-logo.jpg"
          alt="Maui Fest — Elegant Nights"
          fill
          priority
          sizes="100vw"
          quality={95}
          className="object-contain"
        />
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="logo-lightning">
          <defs>
            <filter id="lightning-glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="0.65" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g className="storm-bolt storm-bolt-one">
            <path d="M29 -2 L33 7 L28 13 L37 18 L32 25 L40 30 L36 38 L42 43" />
            <path d="M33 7 L25 12 L29 17 L21 22" />
            <path d="M32 25 L24 29 L28 34 L20 39" />
          </g>
          <g className="storm-bolt storm-bolt-two">
            <path d="M72 -3 L68 5 L74 11 L65 17 L70 23 L61 30 L66 36 L58 44" />
            <path d="M68 5 L77 10 L72 16 L81 21" />
            <path d="M70 23 L78 27 L73 32 L83 37" />
          </g>
          <g className="storm-bolt storm-bolt-three">
            <path d="M50 -4 L54 4 L48 10 L56 16 L51 23 L59 28 L54 34" />
            <path d="M48 10 L40 15 L45 20 L37 25" />
          </g>
        </svg>
        <div aria-hidden="true" className="stage-flash stage-flash-left" />
        <div aria-hidden="true" className="stage-flash stage-flash-right" />
        <button
          type="button"
          onClick={enter}
          disabled={entering}
          className="absolute left-1/2 top-[7%] z-10 inline-flex min-h-12 min-w-48 -translate-x-1/2 items-center justify-center rounded-full border border-gold bg-gold px-8 text-sm font-bold uppercase tracking-[0.18em] text-ink shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-70"
        >
          {entering ? "Ingresando…" : "Ingresar"}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={musicMuted || !musicPlaying ? "Activar sonido de la música" : "Silenciar música"}
          className="absolute bottom-[2%] right-[2%] z-10 rounded-full border border-white/35 bg-ink/80 px-3 py-2 text-[10px] font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-4 sm:text-xs"
        >
          {musicMuted || !musicPlaying ? "♪ Activar sonido" : "Silenciar música"}
        </button>
      </div>
    </div>
  );
}
