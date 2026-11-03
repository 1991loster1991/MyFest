"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  value: string;
  size: number;
  level?: "L" | "M" | "Q" | "H";
  title?: string;
  id?: string;
  marginSize?: number;
};

export function ClientQRCode({ value, size, level = "M", title, id, marginSize }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div aria-hidden="true" style={{ width: size, height: size }} />;
  }

  return <QRCodeSVG value={value} size={size} level={level} title={title} id={id} marginSize={marginSize} />;
}
