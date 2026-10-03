"use client";

import { DownloadIcon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Preto sobre branco sempre: QR Code colorido ou invertido falha em vários leitores.
const QR_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 2,
  color: { dark: "#000000", light: "#ffffff" },
};

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function QrCode({
  value,
  filename,
  size = 220,
  downloadable = true,
}: {
  value: string;
  filename: string;
  size?: number;
  downloadable?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { ...QR_OPTIONS, width: size * 2 }).then((url) => {
      if (active) setPreview(url);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  async function downloadPng() {
    // 1024px: boa qualidade para impressão em cartões.
    download(await QRCode.toDataURL(value, { ...QR_OPTIONS, width: 1024 }), `${filename}.png`);
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(value, { ...QR_OPTIONS, type: "svg" });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(url, `${filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="overflow-hidden rounded-lg bg-white ring-1 ring-foreground/10"
        style={{ width: size, height: size }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`QR Code para ${value}`} width={size} height={size} />
        ) : (
          <div className="size-full animate-pulse bg-muted" />
        )}
      </div>
      {downloadable && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadPng}>
            <DownloadIcon /> PNG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={downloadSvg}>
            <DownloadIcon /> SVG
          </Button>
        </div>
      )}
    </div>
  );
}
