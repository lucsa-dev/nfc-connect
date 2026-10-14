import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircleIcon } from "lucide-react";
import { MarketReport } from "@/components/market/market-report";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { readMarketData } from "@/lib/market";
import { readMarketAnalysis } from "@/lib/market-analysis";
import { readGridPoints } from "@/lib/rank-grid";
import { contactHref, siteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Página pública do relatório de concorrência, para o dono do negócio.
 * Sem login: quem tem o link (token aleatório) vê. Não é indexada.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu negócio no Google Maps", robots: { index: false, follow: false } };

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

export default async function PublicReportPage({ params }: PageProps<"/relatorio/[token]">) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();

  const { data: report } = await createAdminClient()
    .from("market_reports")
    .select("name, data, analysis, rank_grids(points, size, spacing_m, created_at, expires_at)")
    .eq("token", token)
    .eq("status", "ready")
    .gt("rank_grids.expires_at", new Date().toISOString())
    .order("created_at", { referencedTable: "rank_grids", ascending: false })
    .limit(1, { referencedTable: "rank_grids" })
    .maybeSingle();
  const data = report ? readMarketData(report.data) : null;
  if (!report || !data) notFound();

  const gridRow = report.rank_grids[0];
  const grid = gridRow
    ? { points: readGridPoints(gridRow.points), size: gridRow.size, spacingM: gridRow.spacing_m, createdAt: gridRow.created_at }
    : null;
  const contact = contactHref(`Olá! Vi o relatório de ${report.name} no Google Maps e quero conversar sobre a placa de avaliações.`);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:py-12 [&>*]:min-w-0">
      <header className="grid gap-2">
        <p className="text-sm font-medium text-primary">{siteConfig.name} · Relatório de concorrência</p>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{report.name} no Google Maps</h1>
        <p className="text-sm text-muted-foreground">
          Como o seu negócio aparece para quem busca “{data.term}” em {data.area}, comparado aos concorrentes. Gerado em{" "}
          {formatDate(data.generatedAt)}.
        </p>
      </header>

      <MarketReport data={data} analysis={readMarketAnalysis(report.analysis)} grid={grid} audience="public" />

      {contact && (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-brand-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Quer passar os concorrentes?</p>
            <p className="text-sm text-muted-foreground">A placa {siteConfig.name} leva o cliente direto para a tela de avaliação, com um toque.</p>
          </div>
          <Button nativeButton={false} render={<a href={contact} target="_blank" rel="noreferrer" />}>
            <MessageCircleIcon /> Falar com a {siteConfig.name}
          </Button>
        </div>
      )}
    </main>
  );
}
