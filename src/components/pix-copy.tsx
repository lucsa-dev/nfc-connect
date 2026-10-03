"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PixCopy({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: seleciona o texto para cópia manual
      document.getElementById("pix-payload")?.focus();
    }
  }

  return (
    <div className="grid gap-2">
      <textarea
        id="pix-payload"
        readOnly
        value={payload}
        rows={3}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-lg border bg-muted p-2 font-mono text-xs break-all"
        aria-label="Código Pix Copia e Cola"
      />
      <Button size="lg" className="h-11 text-base" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Código copiado!" : "Copiar código Pix"}
      </Button>
    </div>
  );
}
