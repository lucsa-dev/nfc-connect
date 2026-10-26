"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";

const AUTO = "";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/** Para onde a peça leva: automático (página ou o único link) ou um link fixo. */
export function CardModeSelect({
  cardId,
  value,
  links,
  action,
  label,
}: {
  cardId: string;
  value: string | null;
  links: { id: string; name: string; is_active: boolean }[];
  action: (cardId: string, linkId: string | null) => Promise<ActionState>;
  label: string;
}) {
  const [selected, setSelected] = useState(value ?? AUTO);
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={label}
      value={selected}
      disabled={pending}
      className={selectClass}
      onChange={(e) => {
        const previous = selected;
        const next = e.target.value;
        setSelected(next);
        startTransition(async () => {
          const result = await action(cardId, next === AUTO ? null : next);
          if (result.ok) {
            if (result.message) toast.success(result.message);
          } else {
            setSelected(previous);
            toast.error(result.message ?? "Não foi possível salvar.");
          }
        });
      }}
    >
      <option value={AUTO}>Automático</option>
      {links.map((link) => (
        <option key={link.id} value={link.id} disabled={!link.is_active}>
          Direto: {link.name}
          {link.is_active ? "" : " (inativo)"}
        </option>
      ))}
    </select>
  );
}
