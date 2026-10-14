import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  CheckIcon,
  ExternalLinkIcon,
  MessageSquareReplyIcon,
  StarIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import {
  catchUpTargets,
  clientPace,
  daysSince,
  fiveStarsToReach,
  formatMonths,
  hoursInsights,
  profileGaps,
  ratingTargets,
  replyRate,
  shareOfVoice,
  unansweredNegatives,
  WEEKDAYS,
  type Competitor,
  type MarketData,
} from "@/lib/market";
import type { MarketAnalysis } from "@/lib/market-analysis";
import { summarizeGrid, type GridPoint } from "@/lib/rank-grid";

/**
 * Relatório de concorrência: o mesmo componente na página pública
 * (/relatorio/{token}, para o dono do negócio) e no painel (com o argumento de venda).
 */

const decimal = (n: number, digits = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (n: number) => `${Math.round(n * 100)}%`;
const GOOD = "text-[#188038] dark:text-[#81C995]";

function Section({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="grid gap-4 [&>*]:min-w-0">{children}</CardContent>
    </Card>
  );
}

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

function RankChange({ now, before }: { now: number | null; before: number | null }) {
  if (before === null || now === null || before === now) return null;
  const up = now < before;
  const Icon = up ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? GOOD : "text-destructive"}`}>
      <Icon className="size-3" /> {Math.abs(before - now)} {Math.abs(before - now) === 1 ? "posição" : "posições"}
    </span>
  );
}

// Mapa de ranking ------------------------------------------------------------------------

const TIERS = [
  { label: "1º a 3º", max: 3, cell: "bg-[#188038] text-white dark:bg-[#81C995] dark:text-black" },
  { label: "4º a 10º", max: 10, cell: "bg-[#FBBC05] text-black" },
  { label: "11º a 20º", max: 20, cell: "bg-[#F29900] text-black dark:bg-[#FCAD70]" },
  { label: "Fora dos 20", max: Infinity, cell: "bg-destructive text-white" },
] as const;

const tierOf = (rank: number | null) => TIERS.find((t) => (rank ?? Infinity) <= t.max) ?? TIERS[3];

export function RankGridView({
  points,
  size,
  spacingM,
  names,
  createdAt,
}: {
  points: GridPoint[];
  size: number;
  spacingM: number;
  names: Map<string, string>;
  createdAt: string;
}) {
  const summary = summarizeGrid(points);
  const leaderName = summary.leader ? names.get(summary.leader.placeId) ?? "outro negócio" : null;
  const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
  const center = (size - 1) / 2;
  const km = ((size - 1) * spacingM) / 1000;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-start">
      <figure className="grid w-full max-w-80 gap-2">
        <div className="relative rounded-xl bg-muted p-3">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">N</span>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }} role="list" aria-label="Posição em cada ponto">
            {sorted.map((p) => {
              const tier = tierOf(p.rank);
              const isCenter = p.x === center && p.y === center;
              const first = p.top[0] ? names.get(p.top[0]) ?? "outro negócio" : "—";
              return (
                <span
                  key={`${p.x}-${p.y}`}
                  role="listitem"
                  title={`${p.rank ? `${p.rank}º lugar` : "Fora dos 20 primeiros"} · 1º neste ponto: ${first}`}
                  className={`flex aspect-square items-center justify-center rounded-full text-sm font-semibold tabular-nums ${tier.cell} ${isCenter ? "ring-2 ring-foreground ring-offset-2 ring-offset-muted" : ""}`}
                >
                  {p.rank ?? "20+"}
                </span>
              );
            })}
          </div>
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Grade de {size}×{size} pontos, {formatNumber(spacingM)} m entre eles (≈ {decimal(km)} km de lado). O anel marca o negócio.
        </figcaption>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {TIERS.map((t) => (
            <li key={t.label} className="flex items-center gap-1">
              <span className={`size-3 rounded-full ${t.cell}`} aria-hidden /> {t.label}
            </li>
          ))}
        </ul>
      </figure>
      <div className="grid content-start gap-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid">
            <span className="text-xs text-muted-foreground">No top 3</span>
            <span className="text-xl font-semibold tabular-nums">
              {summary.top3} de {summary.total}
            </span>
          </div>
          <div className="grid">
            <span className="text-xs text-muted-foreground">Posição média</span>
            <span className="text-xl font-semibold tabular-nums">{summary.average !== null ? `${decimal(summary.average)}º` : "—"}</span>
          </div>
        </div>
        {leaderName && summary.leader && (
          <p>
            Quem mais aparece em 1º: <strong>{leaderName}</strong> ({summary.leader.points} de {summary.total} pontos).
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Cada ponto simula a busca de alguém naquele lugar. A posição real varia com o histórico de cada pessoa, então trate como
          aproximada. Consultado em {formatDate(createdAt)}.
        </p>
      </div>
    </div>
  );
}

// Relatório ------------------------------------------------------------------------------

function ComparisonTable({ data }: { data: MarketData }) {
  const rows: Array<Competitor & { isClient: boolean }> = [
    { ...data.client, pace: clientPace(data), isClient: true },
    ...data.competitors.slice(0, 8).map((c) => ({ ...c, isClient: false })),
  ].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const others = data.competitors.slice(0, 8);
  const best = {
    rating: Math.max(...others.map((c) => c.rating ?? 0)),
    reviews: Math.max(...others.map((c) => c.reviews)),
    pace: Math.max(...others.map((c) => c.pace)),
  };
  const now = new Date(data.generatedAt);
  /** Destaca em vermelho a métrica em que o cliente perde para o melhor concorrente. */
  const loses = (row: { isClient: boolean }, mine: number, theirs: number) => (row.isClient && others.length > 0 && mine < theirs ? "text-destructive font-medium" : "");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">Pos.</TableHead>
          <TableHead>Negócio</TableHead>
          <TableHead className="text-right">Nota</TableHead>
          <TableHead className="text-right">Avaliações</TableHead>
          <TableHead className="text-right">Novas/mês</TableHead>
          <TableHead className="text-right">Respostas</TableHead>
          <TableHead className="text-right">Fotos</TableHead>
          <TableHead className="text-right">Última</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const rate = replyRate(c);
          const days = daysSince(c.lastReviewAt, now);
          return (
            <TableRow key={c.placeId} className={c.isClient ? "bg-primary/5 font-medium" : ""}>
              <TableCell className="tabular-nums">{c.rank ? `${c.rank}º` : "—"}</TableCell>
              <TableCell className="max-w-[14rem]">
                <span className="flex items-center gap-1.5">
                  <span className="truncate">{c.name}</span>
                  {c.isClient && <Badge>Você</Badge>}
                </span>
              </TableCell>
              <TableCell className={`text-right tabular-nums ${loses(c, c.rating ?? 0, best.rating)}`}>{c.rating !== null ? decimal(c.rating) : "—"}</TableCell>
              <TableCell className={`text-right tabular-nums ${loses(c, c.reviews, best.reviews)}`}>{formatNumber(c.reviews)}</TableCell>
              <TableCell className={`text-right tabular-nums ${loses(c, c.pace, best.pace)}`}>{decimal(c.pace)}</TableCell>
              <TableCell className="text-right tabular-nums">{rate !== null ? pct(rate) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(c.photos)}</TableCell>
              <TableCell className="text-right whitespace-nowrap tabular-nums">{days === null ? "—" : days === 0 ? "hoje" : `${days} d`}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ShareBars({ data }: { data: MarketData }) {
  const share = shareOfVoice(data);
  if (share.length === 0) return <p className="text-sm text-muted-foreground">Sem avaliações recentes suficientes para comparar.</p>;
  const top = share.slice(0, 6);
  const client = share.find((s) => s.isClient);
  if (client && !top.includes(client)) top.push(client);
  const max = Math.max(...top.map((s) => s.share));
  return (
    <ul className="grid gap-2">
      {top.map((s) => (
        <li key={s.placeId} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_3rem]">
          <span className={`truncate ${s.isClient ? "font-medium" : "text-muted-foreground"}`}>{s.isClient ? `${s.name} (você)` : s.name}</span>
          <span className="h-3 rounded-r-[4px] bg-muted" title={`${s.name}: ${pct(s.share)} das avaliações novas`}>
            <span
              className={`block h-full rounded-r-[4px] ${s.isClient ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ width: `${Math.max(2, (s.share / max) * 100)}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{pct(s.share)}</span>
        </li>
      ))}
    </ul>
  );
}

export function MarketReport({
  data,
  analysis,
  grid,
  audience,
}: {
  data: MarketData;
  analysis: MarketAnalysis | null;
  grid: { points: GridPoint[]; size: number; spacingM: number; createdAt: string } | null;
  /** "admin" mostra também o argumento de venda. */
  audience: "public" | "admin";
}) {
  const { client, competitors } = data;
  const pace = clientPace(data);
  const names = new Map([client, ...competitors].map((c) => [c.placeId, c.name]));
  const catchUps = catchUpTargets(data);
  const targets = ratingTargets(client.rating);
  const negatives = unansweredNegatives(client);
  const replies = new Map((analysis?.respostas ?? []).map((r) => [r.numero, r.resposta]));
  const hours = hoursInsights(client, competitors);
  const gaps = profileGaps(client, competitors);
  const share = shareOfVoice(data).find((s) => s.isClient);
  const searched = competitors.length + (client.rank ? 1 : 0);

  return (
    <div className="grid gap-6 [&>*]:min-w-0">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile
          label={`Posição em “${data.term}”`}
          value={client.rank ? `${client.rank}º` : "Fora"}
          hint={
            <>
              {client.rank ? `entre ${searched} resultados` : `não aparece nos ${searched} primeiros`}{" "}
              <RankChange now={client.rank} before={data.previousRank} />
            </>
          }
        />
        <Tile label="Nota" value={client.rating !== null ? decimal(client.rating) : "—"} hint={`${formatNumber(client.reviews)} avaliações`} />
        <Tile
          label="Avaliações novas por mês"
          value={decimal(pace)}
          hint={data.clientPaceFromSnapshots !== null ? "pelas coletas semanais" : "estimado pelas datas recentes"}
        />
        <Tile label="Fatia das avaliações novas" value={share ? pct(share.share) : "—"} hint="entre os negócios da busca" />
      </div>

      {analysis && (
        <Card className="ring-primary/30">
          <CardContent className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">Resumo</span>
            <p>{analysis.resumo}</p>
          </CardContent>
        </Card>
      )}

      <Section
        title="Você e os concorrentes"
        description={
          <>
            Busca “{data.term} em {data.area}” no Google Maps, na ordem em que aparecem. Em vermelho, onde você fica atrás do melhor
            concorrente.
          </>
        }
      >
        <ComparisonTable data={data} />
      </Section>

      {(catchUps.length > 0 || targets.length > 0) && (
        <Section title="Quanto falta" description="Contas com o ritmo atual de avaliações de cada negócio.">
          <div className="grid gap-3 md:grid-cols-2">
            {catchUps.map((c) => (
              <div key={c.rival.placeId} className="grid gap-1 rounded-lg bg-muted/60 p-4">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <span className="font-medium">{c.rival.name}</span>
                <span className="text-2xl font-semibold tabular-nums">
                  {formatNumber(c.gap)}{" "}
                  <span className="text-base font-normal text-muted-foreground">{c.gap === 1 ? "avaliação" : "avaliações"} para passar</span>
                </span>
                <span className="text-sm">
                  No seu ritmo ({decimal(pace)}/mês contra {decimal(c.rival.pace)}/mês dele): <strong>{formatMonths(c.now)}</strong>
                </span>
                {c.withPlate !== null && data.benchmarkPace !== null && data.benchmarkPace > pace && (
                  <span className={`text-sm ${GOOD}`}>
                    Com a placa (média de {decimal(data.benchmarkPace)}/mês dos nossos clientes): <strong>{formatMonths(c.withPlate)}</strong>
                  </span>
                )}
              </div>
            ))}
            {targets.length > 0 && (
              <div className="grid content-start gap-2 rounded-lg bg-muted/60 p-4">
                <span className="text-xs text-muted-foreground">Para subir a nota</span>
                <ul className="grid gap-1.5 text-sm">
                  {targets.map((t) => {
                    const n = fiveStarsToReach(client, t);
                    return (
                      <li key={t} className="flex items-center gap-2">
                        <StarIcon className="size-4 shrink-0 fill-[#FBBC05] text-[#FBBC05]" aria-hidden />
                        <span>
                          Nota <strong>{decimal(t)}</strong>:{" "}
                          {n === null ? "difícil de prever" : n === 0 ? "já alcançada" : <><strong className="tabular-nums">{formatNumber(n)}</strong> {n === 1 ? "avaliação" : "avaliações"} 5 estrelas seguidas</>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <span className="text-xs text-muted-foreground">O Google mostra uma casa decimal: 4,45 já aparece como 4,5.</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {grid && grid.points.length > 0 && (
        <Section title="Mapa de ranking" description={`Sua posição na busca “${data.term}” feita de pontos diferentes ao redor do negócio.`}>
          <RankGridView points={grid.points} size={grid.size} spacingM={grid.spacingM} names={names} createdAt={grid.createdAt} />
        </Section>
      )}

      {analysis && (analysis.elogios_concorrentes.length > 0 || analysis.reclamacoes.length > 0 || analysis.pontos_fortes.length > 0) && (
        <Section title="O que os clientes dizem" description="Leitura das avaliações recentes, suas e dos concorrentes, feita por IA.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid content-start gap-2">
              <h3 className="text-sm font-medium">Elogiam nos concorrentes</h3>
              <ul className="grid gap-2 text-sm">
                {analysis.elogios_concorrentes.map((e) => (
                  <li key={`${e.concorrente}-${e.tema}`} className="grid gap-0.5">
                    <span className="font-medium">
                      {e.tema} <span className="font-normal text-muted-foreground">· {e.concorrente}</span>
                    </span>
                    <span className="text-muted-foreground">{e.detalhe}</span>
                  </li>
                ))}
                {analysis.elogios_concorrentes.length === 0 && <li className="text-muted-foreground">Nada que se destaque.</li>}
              </ul>
            </div>
            <div className="grid content-start gap-2">
              <h3 className="text-sm font-medium">Reclamam de você</h3>
              <ul className="grid gap-2 text-sm">
                {analysis.reclamacoes.map((r) => (
                  <li key={r.tema} className="grid gap-0.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" aria-hidden /> {r.tema}
                    </span>
                    <span className="text-muted-foreground">{r.detalhe}</span>
                  </li>
                ))}
                {analysis.reclamacoes.length === 0 && <li className="text-muted-foreground">Nenhuma reclamação recorrente.</li>}
              </ul>
            </div>
            <div className="grid content-start gap-2">
              <h3 className="text-sm font-medium">Elogiam em você</h3>
              <ul className="grid gap-2 text-sm">
                {analysis.pontos_fortes.map((p) => (
                  <li key={p} className="flex gap-1.5">
                    <CheckIcon className={`mt-0.5 size-3.5 shrink-0 ${GOOD}`} aria-hidden /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {negatives.length > 0 && (
        <Section
          title="Avaliações negativas sem resposta"
          description="Responder com educação mostra cuidado a quem lê e pesa no ranking. Copie, ajuste e publique no Google."
        >
          <ul className="grid gap-3">
            {negatives.map((r, i) => (
              <li key={`${r.date}-${i}`} className="grid gap-2 rounded-lg bg-muted/60 p-3 text-sm">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex" aria-label={`${r.stars} estrelas`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <StarIcon key={s} className={`size-3 ${s < (r.stars ?? 0) ? "fill-[#FBBC05] text-[#FBBC05]" : "text-muted-foreground/40"}`} />
                    ))}
                  </span>
                  {r.date && formatDate(r.date)}
                </span>
                <p>“{r.text}”</p>
                {replies.get(i + 1) && (
                  <p className="flex gap-2 rounded-md bg-background p-2.5 ring-1 ring-foreground/10">
                    <MessageSquareReplyIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{replies.get(i + 1)}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(hours.length > 0 || gaps.length > 0) && (
        <Section title="Oportunidades no perfil" description="Comparado com o que os concorrentes da busca mostram no Google.">
          <ul className="grid gap-3 text-sm">
            {hours.map((h) => (
              <li key={`${h.kind}-${h.day}`} className="flex gap-2">
                <CalendarClockIcon className={`mt-0.5 size-4 shrink-0 ${h.kind === "diferencial" ? GOOD : "text-destructive"}`} aria-hidden />
                <span>
                  {h.kind === "sem_horario" && <>Seu perfil não mostra o horário de funcionamento; {h.open} concorrentes mostram.</>}
                  {h.kind === "diferencial" && h.day !== null && (
                    <>
                      <strong>Você abre {WEEKDAYS[h.day]}</strong> e só {h.open} de {h.of} concorrentes abrem. Divulgue isso nas fotos, nas
                      postagens e na descrição.
                    </>
                  )}
                  {h.kind === "perdendo" && h.day !== null && (
                    <>
                      <strong>Fechado {WEEKDAYS[h.day]}</strong>, enquanto {h.open} de {h.of} concorrentes abrem: quem busca nesse dia
                      vai para eles.
                    </>
                  )}
                </span>
              </li>
            ))}
            {gaps.map((g) => (
              <li key={g.id} className="flex gap-2">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-[#F29900]" aria-hidden />
                <span>
                  <strong>{g.label}</strong>: {g.detail}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Quem leva as avaliações novas" description="Fatia estimada das avaliações novas por mês entre os negócios da busca.">
        <ShareBars data={data} />
      </Section>

      {data.plate && (
        <Section title="Resultado da placa" description="Últimos 30 dias.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="grid">
              <span className="text-xs text-muted-foreground">Toques e leituras do QR</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(data.plate.taps30d)}</span>
            </div>
            <div className="grid">
              <span className="text-xs text-muted-foreground">Avaliações novas</span>
              <span className="text-2xl font-semibold tabular-nums">{data.plate.reviews30d !== null ? formatNumber(data.plate.reviews30d) : "—"}</span>
            </div>
            {data.plate.reviews30d !== null && data.plate.taps30d > 0 && (
              <div className="grid">
                <span className="text-xs text-muted-foreground">Viraram avaliação</span>
                <span className="flex items-center gap-1 text-2xl font-semibold tabular-nums">
                  <TrendingUpIcon className={`size-5 ${GOOD}`} aria-hidden />
                  {pct(Math.min(1, data.plate.reviews30d / data.plate.taps30d))}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {audience === "admin" && analysis && (
        <Card className="ring-primary/30">
          <CardContent className="grid gap-1">
            <span className="text-xs font-medium text-primary">Mensagem para o dono (só você vê)</span>
            <p className="text-sm">{analysis.argumento_venda}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Dados públicos do Google Maps coletados em {formatDate(data.generatedAt)}. “Novas por mês” é estimado pelas datas das
        avaliações mais recentes de cada negócio.
        {client.mapsUrl && (
          <>
            {" "}
            <a href={client.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Ver no Google Maps <ExternalLinkIcon className="size-3" />
            </a>
          </>
        )}
      </p>
    </div>
  );
}
