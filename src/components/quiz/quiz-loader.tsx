"use client";

import dynamic from "next/dynamic";
import type { ArtData } from "@/components/cards/print-art";

// Só no navegador: o progresso vem do localStorage (evita divergência na hidratação).
const Quiz = dynamic(() => import("@/components/quiz/quiz").then((m) => m.Quiz), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-brand-surface" aria-busy="true" />,
});

export function QuizLoader({ art, whatsapp }: { art: ArtData; whatsapp: string | null }) {
  return <Quiz art={art} whatsapp={whatsapp} />;
}
