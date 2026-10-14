import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { RankGridButton, ReportForm, RunPoller, WhatsAppShare } from "@/components/market/market-actions";
import { MarketReport } from "@/components/market/market-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getReport } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { readMarketData } from "@/lib/market";
import { readMarketAnalysis } from "@/lib/market-analysis";
import { readGridPoints } from "@/lib/rank-grid";
import { getSiteUrl } from "@/lib/urls";
import { checkReport, deleteReport } from "../actions";

// Ao terminar a coleta, a IA compara as avaliações (até ~2 min); o mapa faz 25 buscas.
export const maxDuration = 300;

export async function generateMetadata({ params }: PageProps<"/dashboard/relatorios/[reportId]">): Promise<Metadata> {
  const { reportId } = await params;
  const report = await getReport(reportId);
  return { title: `Relatório · ${report.name}` };
}

export default async function ReportPage({ params }: PageProps<"/dashboard/relatorios/[reportId]">) {
  const { reportId } = await params;
  const report = await getReport(reportId);
  const data = readMarketData(report.data);
  const analysis = readMarketAnalysis(report.analysis);
  const gridRow = report.rank_grids[0];
  const grid = gridRow
    ? { points: readGridPoints(gridRow.points), size: gridRow.size, spacingM: gridRow.spacing_m, createdAt: gridRow.created_at }
    : null;
  const publicUrl = `${getSiteUrl()}/relatorio/${report.token}`;
  const placesEnabled = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const breadcrumbs = report.business_id
    ? [{ href: `/dashboard/${report.business_id}`, label: report.name }]
    : [{ href: "/dashboard/prospeccao", label: "Prospecção" }];

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={`Concorrência: ${report.name}`}
        description={`“${report.term} em ${report.area}” · ${formatDateTime(report.created_at)}`}
        actions={
          <ConfirmDelete
            title="Excluir relatório?"
            description="O link público deixa de funcionar."
            action={deleteReport.bind(null, report.id)}
          />
        }
      />

      {report.status === "running" && (
        <RunPoller check={checkReport.bind(null, report.id)} message="Buscando os concorrentes no Google Maps e lendo as avaliações. Leva de 1 a 4 minutos." />
      )}

      {report.status === "failed" && (
        <Card>
          <CardContent className="grid gap-4">
            <p className="text-sm text-destructive">{report.error ?? "A coleta falhou."}</p>
            <ReportForm
              target={report.business_id ? { businessId: report.business_id } : { placeId: report.place_id, name: report.name }}
              defaultTerm={report.term}
              defaultArea={report.area}
              label="Tentar de novo"
            />
          </CardContent>
        </Card>
      )}

      {report.status === "ready" && data && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button size="sm" nativeButton={false} render={<a href={publicUrl} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon /> Abrir página do cliente
            </Button>
            <CopyButton value={publicUrl} label="Copiar link" showLabel />
            <WhatsAppShare url={publicUrl} name={report.name} />
            {placesEnabled && <RankGridButton reportId={report.id} hasGrid={Boolean(grid)} />}
          </div>
          {!placesEnabled && (
            <p className="mb-4 text-xs text-muted-foreground">
              Para o mapa de ranking, configure a variável GOOGLE_PLACES_API_KEY (Places API).
            </p>
          )}
          <MarketReport data={data} analysis={analysis} grid={grid} audience="admin" />
        </>
      )}
    </>
  );
}
