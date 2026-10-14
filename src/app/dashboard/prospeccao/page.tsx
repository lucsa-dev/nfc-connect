import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProspectForm } from "@/components/market/market-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apifyEnabled } from "@/lib/apify";
import { listProspectSearches, listReports } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readMarketData } from "@/lib/market";

export const metadata: Metadata = { title: "Prospecção" };

const STATUS = { running: "Buscando", ready: "Pronto", failed: "Falhou" } as Record<string, string>;

export default async function ProspectingPage() {
  const [searches, reports] = await Promise.all([listProspectSearches(), listReports({})]);

  return (
    <>
      <PageHeader
        title="Prospecção"
        description="Ache no Google Maps os negócios de uma região que mais ganham com a placa e gere o relatório antes da visita."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nova busca</CardTitle>
          <p className="text-sm text-muted-foreground">
            Coleta até 40 negócios da busca e ordena pela nota de oportunidade: nota boa com poucas avaliações, ritmo baixo, dono que
            não responde e perfil incompleto. Leva de 1 a 4 minutos.
          </p>
        </CardHeader>
        <CardContent>
          {apifyEnabled() ? <ProspectForm /> : <p className="text-sm text-muted-foreground">Configure a variável APIFY_TOKEN para buscar negócios.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">Buscas</h2>
          {searches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma busca ainda.</p>
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {searches.map((s) => (
                  <li key={s.id}>
                    <Link href={`/dashboard/prospeccao/${s.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {s.term} em {s.area}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(s.created_at)}
                          {s.status === "ready" && ` · ${s.count} negócios`}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {s.status !== "ready" && <Badge variant={s.status === "failed" ? "outline" : "secondary"}>{STATUS[s.status]}</Badge>}
                        <ChevronRightIcon className="size-4 text-muted-foreground" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        <section className="grid content-start gap-3">
          <h2 className="text-lg font-semibold">Relatórios de prospectos</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Gere o relatório de um negócio a partir de uma busca.</p>
          ) : (
            <Card className="py-0">
              <ul className="divide-y">
                {reports.map((r) => {
                  const rank = readMarketData(r.data)?.client.rank;
                  return (
                    <li key={r.id}>
                      <Link href={`/dashboard/relatorios/${r.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">
                            “{r.term} em {r.area}” · {formatDateTime(r.created_at)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {r.status === "ready" ? (
                            <Badge variant="secondary">{rank ? `${rank}º` : "fora"}</Badge>
                          ) : (
                            <Badge variant="outline">{STATUS[r.status]}</Badge>
                          )}
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
