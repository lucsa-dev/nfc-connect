import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { ReportForm } from "@/components/market/market-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { MONTHLY_REPORT_DAYS, readMarketData } from "@/lib/market";

const STATUS: Record<string, string> = { running: "Buscando", failed: "Falhou" };

/** Seção "Concorrência" da página do negócio: gerar relatório e ver os anteriores. */
export function MarketPanel({
  businessId,
  defaultTerm,
  defaultArea,
  reports,
  planExpiresAt,
  enabled,
}: {
  businessId: string;
  defaultTerm: string;
  defaultArea: string;
  reports: Array<{ id: string; term: string; area: string; status: string; data: unknown; created_at: string }>;
  /** Fim do plano (um ano após a ativação da peça): até lá, relatório mensal automático. */
  planExpiresAt: string | null;
  enabled: boolean;
}) {
  const planActive = planExpiresAt !== null && new Date(planExpiresAt) > new Date();
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Concorrência</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compara o negócio com os concorrentes da mesma busca no Google Maps: posição, avaliações, ritmo, respostas, horário e o que
          os clientes dizem. Gera um link para mandar ao dono.
        </p>
        {planExpiresAt && (
          <p className="text-sm">
            {planActive ? (
              <>
                <Badge variant="secondary" className="mr-1.5">Plano ativo</Badge>
                Relatório novo a cada {MONTHLY_REPORT_DAYS} dias, com a busca do último, até {formatDate(planExpiresAt)}.
              </>
            ) : (
              <>
                <Badge variant="outline" className="mr-1.5">Plano vencido</Badge>
                Venceu em {formatDate(planExpiresAt)}: os relatórios mensais pararam.
              </>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {enabled ? (
          <ReportForm target={{ businessId }} defaultTerm={defaultTerm} defaultArea={defaultArea} />
        ) : (
          <p className="text-sm text-muted-foreground">Configure a variável APIFY_TOKEN para buscar os concorrentes.</p>
        )}
        {reports.length > 0 && (
          <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
            {reports.map((r) => {
              const data = r.status === "ready" ? readMarketData(r.data) : null;
              return (
                <li key={r.id}>
                  <Link href={`/dashboard/relatorios/${r.id}`} className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        “{r.term} em {r.area}”
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {data ? (
                        <Badge variant="secondary">{data.client.rank ? `${data.client.rank}º lugar` : "fora da lista"}</Badge>
                      ) : (
                        <Badge variant="outline">{STATUS[r.status] ?? r.status}</Badge>
                      )}
                      <ChevronRightIcon className="size-4 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
