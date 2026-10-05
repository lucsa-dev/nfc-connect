"use client";

import { ArchiveIcon, RotateCcwIcon, StoreIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { convertLead, setLeadStatus } from "@/app/dashboard/pedidos/actions";
import { Button } from "@/components/ui/button";

export function LeadActions({ leadId, status, hasPlace }: { leadId: string; status: string; hasPlace: boolean }) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok?: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (result?.message) (result.ok ? toast.success : toast.error)(result.message);
    });

  if (status === "convertido") return null;

  return (
    <>
      <Button onClick={() => run(() => convertLead(leadId))} disabled={pending} title={hasPlace ? undefined : "Sem Place ID: o link de avaliação precisa ser criado manualmente"}>
        <StoreIcon /> {hasPlace ? "Criar negócio e link" : "Criar negócio"}
      </Button>
      {status === "descartado" ? (
        <Button variant="outline" onClick={() => run(() => setLeadStatus(leadId, "lead"))} disabled={pending}>
          <RotateCcwIcon /> Reabrir
        </Button>
      ) : (
        <Button variant="outline" onClick={() => run(() => setLeadStatus(leadId, "descartado"))} disabled={pending}>
          <ArchiveIcon /> Descartar
        </Button>
      )}
    </>
  );
}
