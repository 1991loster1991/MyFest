"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/Button";

export function DoorScanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function startCamera() {
    if (!videoRef.current) return;
    setError("");
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _decodeError, activeControls) => {
          if (!result) return;
          activeControls.stop();
          controlsRef.current = null;
          setCameraOpen(false);
          onScan(result.getText());
        }
      );
      controlsRef.current = controls;
      setCameraOpen(true);
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : "No se pudo acceder a la cámara.");
      setCameraOpen(false);
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraOpen(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-black/20 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 min-[400px]:flex-row">
        {!cameraOpen ? (
          <Button type="button" onClick={() => void startCamera()}>Abrir cámara QR / DNI</Button>
        ) : (
          <Button type="button" variant="secondary" onClick={stopCamera}>Cerrar cámara</Button>
        )}
        <p className="self-center text-xs text-muted">Usá HTTPS o localhost para habilitar la cámara.</p>
      </div>
      {cameraOpen && <video ref={videoRef} className="max-h-72 w-full rounded-xl bg-black object-cover" muted playsInline />}
      {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
      <p className="text-xs leading-5 text-muted">Lee QR de reserva y códigos PDF417 de DNI compatibles. Los datos se validan contra la lista autorizada del evento.</p>
    </div>
  );
}
