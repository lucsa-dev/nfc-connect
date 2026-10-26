"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

type MemberAction = () => Promise<ActionState>;

/** Botões de um membro do negócio: liberar (pendente), reenviar o link e remover. */
export function MemberActions({
  pending,
  approve,
  resend,
  remove,
}: {
  pending: boolean;
  approve: MemberAction;
  resend: MemberAction;
  remove: MemberAction;
}) {
  const [busy, startTransition] = useTransition();
  const run = (action: MemberAction) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Algo deu errado.");
    });

  return (
    <div className="flex flex-wrap gap-2">
      {pending ? (
        <Button size="sm" disabled={busy} onClick={() => run(approve)}>
          Liberar acesso
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(resend)}>
          Reenviar link
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(remove)}>
        Remover
      </Button>
    </div>
  );
}
