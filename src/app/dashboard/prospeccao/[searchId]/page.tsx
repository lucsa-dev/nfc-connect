import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProspectReportButton, RunPoller } from "@/components/market/market-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProspectSearch } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { readProspects, type Prospect } from "@/lib/market";
import { checkProspect } from "../../relatorios/actions";

export const metadata: Metadata = { title: "Prospecção" };

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Faixa da nota de oportunidade, com rótulo (a cor nunca vem sozinha). */
function ScoreBadge({ score }: { score: number }) {
  const [label, variant] = score >= 60 ? ["Alta", "default"] : score >= 35 ? ["Média", "secondary"] : ["Baixa", "outline"];
  return (
    <Badge variant={variant as "default" | "secondary" | "outline"} className="tabular-nums">
      {score} · {label}
    </Badge>
  );
}

function MapsLink({ p }: { p: Prospect }) {
  if (!p.mapsUrl) return null;
  return (
    <a href={p.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
      Maps <ExternalLinkIcon className="size-3" />
    </a>
  );
}

export default async function ProspectSearchPage({ params }: PageProps<"/dashboard/prospeccao/[searchId]">) {
  const { searchId } = await params;
  const search = await getProspectSearch(searchId);
  const prospects = readProspects(search.results).filter((p) => !p.closed);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard/prospeccao", label: "Prospecção" }]}
        title={`${search.term} em ${search.area}`}
        description={`Busca de ${formatDateTime(search.created_at)}. Ordenado pela nota de oportunidade.`}
      />

      {search.status === "running" && (
        <RunPoller check={checkProspect.bind(null, search.id)} message="Buscando os negócios no Google Maps. Leva de 1 a 4 minutos." />
      )}
      {search.status === "failed" && <p className="text-sm text-destructive">{search.error ?? "A busca falhou."}</p>}

      {search.status === "ready" &&
        (prospects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum negócio encontrado. Tente outro termo ou região.</CardContent>
          </Card>
        ) : (
          <Card className="py-0">
            <ul className="divide-y md:hidden">
              {prospects.map((p) => (
                <li key={p.placeId} className="grid gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.rating !== null ? `${decimal(p.rating)} ★` : "sem nota"} · {formatNumber(p.reviews)} avaliações · {decimal(p.pace)}/mês
                      </span>
                    </span>
                    <ScoreBadge score={p.score} />
                  </div>
                  {p.reasons.length > 0 && <p className="text-xs text-muted-foreground">{p.reasons.join(" · ")}</p>}
                  <div className="flex items-center gap-3">
                    <ProspectReportButton placeId={p.placeId} name={p.name} term={search.term} area={search.area} />
                    <MapsLink p={p} />
                  </div>
                </li>
              ))}
            </ul>
            <Table className="max-md:hidden">
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Negócio</TableHead>
                  <TableHead className="text-right">Pos.</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead className="text-right">Avaliações</TableHead>
                  <TableHead className="text-right">Novas/mês</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p) => (
                  <TableRow key={p.placeId}>
                    <TableCell>
                      <ScoreBadge score={p.score} />
                    </TableCell>
                    <TableCell className="max-w-[22rem] whitespace-normal">
                      <span className="block font-medium">{p.name}</span>
                      {p.reasons.length > 0 && <span className="block text-xs text-muted-foreground">{p.reasons.join(" · ")}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.rank ? `${p.rank}º` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.rating !== null ? decimal(p.rating) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.reviews)}</TableCell>
                    <TableCell className="text-right tabular-nums">{decimal(p.pace)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <MapsLink p={p} />
                        <ProspectReportButton placeId={p.placeId} name={p.name} term={search.term} area={search.area} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}
    </>
  );
}
