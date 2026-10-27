import { StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Analysis } from "@/lib/google-analysis";

const IMPACT: Record<
  Analysis["melhorias"][number]["impacto"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  alto: { label: "Impacto alto", variant: "default" },
  medio: { label: "Impacto médio", variant: "secondary" },
  baixo: { label: "Impacto baixo", variant: "outline" },
};

/** Resumo, pontos fortes e melhorias da análise do perfil (painel e /conta). */
export function AnalysisDetails({ analysis }: { analysis: Analysis }) {
  return (
    <>
      <p className="text-sm">{analysis.resumo}</p>
      {analysis.pontos_fortes.length > 0 && (
        <div className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Pontos fortes
          </span>
          <ul className="grid gap-1 text-sm">
            {analysis.pontos_fortes.map((p) => (
              <li key={p} className="flex gap-2">
                <StarIcon className="mt-0.5 size-3.5 shrink-0 fill-[#FBBC05] text-[#FBBC05]" />{" "}
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          O que melhorar
        </span>
        <ol className="grid gap-2">
          {analysis.melhorias.map((m) => (
            <li
              key={m.titulo}
              className="grid gap-0.5 rounded-lg bg-muted/60 p-3 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {m.titulo}{" "}
                <Badge variant={IMPACT[m.impacto].variant}>
                  {IMPACT[m.impacto].label}
                </Badge>
              </span>
              <span className="text-muted-foreground">{m.detalhe}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
