import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, ExternalLinkIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProspectReportButton, RunPoller } from "@/components/market/market-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLatestReportsByPlace, getProspectSearch } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { NEARBY_ALL } from "@/lib/apify-maps";
import { formatDistance, readProspects, type Prospect } from "@/lib/market";
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

/**
 * Busca do relatório de um negócio achado: na busca "perto de mim" a região é o
 * bairro dele, e sem tipo escolhido o termo é a categoria dele no Google.
 */
function reportSearch(p: Prospect, search: { term: string; area: string; center_lat: number | null }) {
  if (search.center_lat === null) return { term: search.term, area: search.area };
  const term = search.term === NEARBY_ALL ? (p.category?.toLocaleLowerCase("pt-BR") ?? "comércio") : search.term;
  const area = p.area ?? p.address?.split(" - ").slice(-2, -1)[0]?.trim() ?? "";
  return { term, area };
}

type ExistingReport = { id: string; status: string };

/** Marca o negócio que já tem relatório (pronto ou ainda gerando). */
function ReportFlag({ report }: { report: ExistingReport | undefined }) {
  if (!report) return null;
  const running = report.status === "running";
  return (
    <Badge variant="secondary" className="ml-2 align-middle">
      {running ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
      {running ? "Gerando relatório" : "Relatório criado"}
    </Badge>
  );
}

/** Nome do negócio: abre o relatório quando já existe um. */
function ProspectName({ p, report }: { p: Prospect; report: ExistingReport | undefined }) {
  return (
    <span className="font-medium break-words">
      {report ? (
        <Link href={`/dashboard/relatorios/${report.id}`} className="hover:underline">
          {p.name}
        </Link>
      ) : (
        p.name
      )}
      <ReportFlag report={report} />
    </span>
  );
}

/** Abre o relatório existente ou gera um novo. */
function ReportAction({ p, report, search }: { p: Prospect; report: ExistingReport | undefined; search: Parameters<typeof reportSearch>[1] }) {
  if (!report) return <ProspectReportButton placeId={p.placeId} name={p.name} {...reportSearch(p, search)} />;
  return (
    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/relatorios/${report.id}`} />}>
      <FileTextIcon /> Ver relatório
    </Button>
  );
}

const SORTS = [
  { id: "oportunidade", label: "Oportunidade" },
  { id: "distancia", label: "Mais perto" },
] as const;

export default async function ProspectSearchPage({ params, searchParams }: PageProps<"/dashboard/prospeccao/[searchId]">) {
  const { searchId } = await params;
  const search = await getProspectSearch(searchId);
  const nearby = search.center_lat !== null;
  const byDistance = nearby && (await searchParams).ordem === "distancia";
  const prospects = readProspects(search.results).filter((p) => !p.closed);
  if (byDistance) prospects.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
  const reports = await getLatestReportsByPlace(prospects.map((p) => p.placeId));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard/prospeccao", label: "Prospecção" }]}
        title={nearby ? `${search.term[0]!.toUpperCase()}${search.term.slice(1)} ${search.area}` : `${search.term} em ${search.area}`}
        description={`Busca de ${formatDateTime(search.created_at)}. ${byDistance ? "Do mais perto para o mais longe." : "Ordenado pela nota de oportunidade."}`}
      />

      {search.status === "running" && (
        <RunPoller check={checkProspect.bind(null, search.id)} message="Buscando os negócios no Google Maps. Leva de 1 a 4 minutos." />
      )}
      {search.status === "failed" && <p className="text-sm text-destructive">{search.error ?? "A busca falhou."}</p>}

      {search.status === "ready" && nearby && prospects.length > 1 && (
        <div className="mb-4 flex w-fit rounded-lg bg-muted p-0.5" role="group" aria-label="Ordenar">
          {SORTS.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/prospeccao/${search.id}${o.id === "distancia" ? "?ordem=distancia" : ""}`}
              aria-current={(o.id === "distancia") === byDistance ? "page" : undefined}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
            >
              {o.label}
            </Link>
          ))}
        </div>
      )}

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
                      <span className="block">
                        <ProspectName p={p} report={reports.get(p.placeId)} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          p.distanceM != null && formatDistance(p.distanceM),
                          p.category,
                          p.rating !== null ? `${decimal(p.rating)} ★` : "sem nota",
                          `${formatNumber(p.reviews)} avaliações`,
                          `${decimal(p.pace)}/mês`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ScoreBadge score={p.score} />
                  </div>
                  {p.reasons.length > 0 && <p className="text-xs text-muted-foreground">{p.reasons.join(" · ")}</p>}
                  <div className="flex items-center gap-3">
                    <ReportAction p={p} report={reports.get(p.placeId)} search={search} />
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
                  <TableHead className="text-right">{nearby ? "Distância" : "Pos."}</TableHead>
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
                      <span className="block">
                        <ProspectName p={p} report={reports.get(p.placeId)} />
                      </span>
                      {p.category && <span className="block text-xs text-muted-foreground">{p.category}</span>}
                      {p.reasons.length > 0 && <span className="block text-xs text-muted-foreground">{p.reasons.join(" · ")}</span>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {nearby ? (p.distanceM != null ? formatDistance(p.distanceM) : "—") : p.rank ? `${p.rank}º` : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.rating !== null ? decimal(p.rating) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(p.reviews)}</TableCell>
                    <TableCell className="text-right tabular-nums">{decimal(p.pace)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <MapsLink p={p} />
                        <ReportAction p={p} report={reports.get(p.placeId)} search={search} />
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
