"use client";

import { useEffect, useState } from "react";
import { ClientQRCode } from "@/components/ui/ClientQRCode";
import { Button } from "@/components/ui/Button";

export default function EntryQrPage() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/pre-ingreso`);
  }, []);

  function downloadSvg() {
    const svg = document.querySelector<SVGSVGElement>("#mauifest-entry-qr");
    if (!svg) return;
    const file = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "maui-fest-qr-pre-reserva.svg";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function downloadPng() {
    const svg = document.querySelector<SVGSVGElement>("#mauifest-entry-qr");
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const link = document.createElement("a");
      link.download = "maui-fest-qr-pre-reserva.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    image.src = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-black/5 bg-white p-6 shadow-card sm:p-9">
      <p className="text-xs font-bold tracking-[0.18em] text-muted">MAUI FEST / PRE-RESERVA</p>
      <h2 className="mt-2 text-2xl font-black sm:text-3xl">QR de pre-reserva</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Este QR abre directamente el lobby de Maui Fest, con la imagen y la música. Desde el botón Ingresar se accede al formulario para pedir un lugar.</p>
      <div className="mx-auto my-7 flex w-fit rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        {url ? <ClientQRCode id="mauifest-entry-qr" value={url} size={280} level="H" marginSize={4} /> : <div className="size-[280px] animate-pulse rounded bg-paper" />}
      </div>
      <p className="mb-5 break-all rounded-xl bg-paper p-3 text-center font-mono text-xs text-muted">{url || "Preparando enlace…"}</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={() => void downloadPng()} disabled={!url}>Descargar PNG</Button>
        <Button type="button" variant="secondary" onClick={downloadSvg} disabled={!url}>Descargar SVG</Button>
        <Button type="button" variant="secondary" onClick={() => void copyLink()} disabled={!url}>{copied ? "Enlace copiado" : "Copiar enlace"}</Button>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-muted">El código apunta al dominio donde abriste esta página. Para compartirlo con el público, descargalo desde el dominio publicado del evento.</p>
    </section>
  );
}
