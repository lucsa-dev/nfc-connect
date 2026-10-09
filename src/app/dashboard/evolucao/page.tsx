import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listGoogleBusinesses, listSnapshotPoints } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { computeGrowth, type Growth } from "@/lib/growth";

export const metadata: Metadata = { title: "Evolução no Google" };

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const tone = value > 0 ? "text-[#188038] dark:text-[#81C995]" : value < 0 ? "text-destructive" : "text-muted-foreground";
  return <span className={`tabular-nums ${tone}`}>{value > 0 ? `+${formatNumber(value)}` : formatNumber(value)}</span>;
}

/** Minigráfico das avaliações por coleta. */
function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const w = 80;
  const h = 24;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="text-primary">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export default async function GrowthPage() {
  const [businesses, points] = await Promise.all([listGoogleBusinesses(), listSnapshotPoints(365)]);
  const growth = computeGrowth(points);

  const rows = businesses
    .map((b) => ({ ...b, growth: growth.get(b.id) ?? null }))
    .sort((a, b) => (b.growth?.reviews30d ?? -Infinity) - (a.growth?.reviews30d ?? -Infinity));

  const withData = rows.map((r) => r.growth).filter((g): g is Growth => g !== null);
  const new30d = withData.reduce((sum, g) => sum + Math.max(0, g.reviews30d ?? 0), 0);
  const growing = withData.filter((g) => (g.reviews30d ?? 0) > 0).length;
  const rated = withData.filter((g) => g.rating !== null);
  const avgRating = rated.length ? rated.reduce((sum, g) => sum + g.rating!, 0) / rated.length : null;

  return (
    <>
      <PageHeader
        title="Evolução no Google"
        description="Nota e avaliações dos seus clientes no Google Maps, coletadas automaticamente toda semana."
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <TrendingUpIcon className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum cliente vinculado ao Google</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Os negócios entram aqui ao ativar um cartão em branco, ao converter um pedido do quiz ou ao vincular pelo painel do negócio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Summary label="Clientes no Google" value={formatNumber(rows.length)} />
            <Summary label="Novas avaliações (30 dias)" value={`+${formatNumber(new30d)}`} />
            <Summary label="Crescendo" value={`${formatNumber(growing)} de ${formatNumber(rows.length)}`} hint="com avaliações novas em 30 dias" />
            <Summary label="Nota média" value={avgRating !== null ? avgRating.toFixed(2).replace(".", ",") : "—"} />
          </div>

          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead className="text-right">Avaliações</TableHead>
                  <TableHead className="text-right">7 dias</TableHead>
                  <TableHead className="text-right">30 dias</TableHead>
                  <TableHead className="text-right">Desde o início</TableHead>
                  <TableHead className="hidden md:table-cell">
                    <span className="sr-only">Tendência</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ id, name, growth: g }) => (
                  <TableRow key={id}>
                    <TableCell>
                      <Link href={`/dashboard/${id}`} className="font-medium hover:underline">
                        {name}
                      </Link>
                      {g && <div className="text-xs text-muted-foreground">desde {formatDate(g.firstAt)}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{g?.rating != null ? g.rating.toFixed(1).replace(".", ",") : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{g?.reviews != null ? formatNumber(g.reviews) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Delta value={g?.reviews7d ?? null} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Delta value={g?.reviews30d ?? null} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Delta value={g?.reviewsTotal ?? null} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{g && <Sparkline series={g.series} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
