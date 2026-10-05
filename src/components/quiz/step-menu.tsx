"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { canJumpTo, MENU_STEPS, STEPS, type QuizState } from "@/components/quiz/state";

/**
 * Menu de etapas: mostra o progresso e permite voltar (ou avançar até onde
 * já chegou) para editar uma resposta.
 */
export function StepMenu({ state, onSelect }: { state: QuizState; onSelect: (step: number) => void }) {
  const listRef = useRef<HTMLOListElement>(null);
  const currentKey = STEPS[state.step];

  // Mantém a etapa atual visível quando o menu rola na horizontal (celular).
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!el || !listRef.current) return;
    const list = listRef.current;
    // offsetLeft é relativo à lista (ela é `relative`); centraliza a etapa atual.
    list.scrollTo({ left: Math.max(0, el.offsetLeft - (list.clientWidth - el.clientWidth) / 2), behavior: "smooth" });
  }, [currentKey]);

  return (
    <nav aria-label="Etapas do pedido" className="border-b bg-background/90">
      <ol
        ref={listRef}
        className="relative mx-auto flex w-fit max-w-full gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MENU_STEPS.map(({ key, label }, i) => {
          const index = STEPS.indexOf(key);
          const current = key === currentKey;
          const done = !current && index <= state.maxStep && index < Math.max(state.step, state.maxStep + 1);
          const enabled = !current && canJumpTo(state, index);
          return (
            <li key={key} className="shrink-0">
              <button
                type="button"
                onClick={() => enabled && onSelect(index)}
                disabled={!enabled}
                aria-current={current ? "step" : undefined}
                aria-label={`Etapa ${i + 1}: ${label}${current ? " (atual)" : done ? " (concluída)" : ""}`}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                  current
                    ? "bg-primary text-primary-foreground"
                    : enabled
                      ? "text-foreground hover:bg-muted"
                      : "text-muted-foreground/60"
                }`}
              >
                <span
                  className={`flex size-4.5 items-center justify-center rounded-full text-[10px] tabular-nums ${
                    current ? "bg-primary-foreground/25" : done ? "bg-[#34A853] text-white" : "ring-1 ring-current"
                  }`}
                  aria-hidden
                >
                  {done ? <CheckIcon className="size-3" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
