"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WifiCopy({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: seleciona a senha para cópia manual
      document.getElementById("wifi-password")?.focus();
    }
  }

  return (
    <div className="grid gap-2">
      <input
        id="wifi-password"
        readOnly
        value={password}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border bg-muted px-3 py-2 text-center font-mono text-lg"
        aria-label="Senha do Wi-Fi"
      />
      <Button size="lg" className="h-11 text-base" onClick={copy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Senha copiada!" : "Copiar senha"}
      </Button>
    </div>
  );
}
