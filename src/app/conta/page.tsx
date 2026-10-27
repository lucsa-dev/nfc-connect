import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronRightIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnalysisDetails } from "@/components/google/analysis-details";
import { RunPoller } from "@/components/market/market-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProduct } from "@/lib/card";
import { isCurrentUserAdmin, listMemberships } from "@/lib/data";
import { formatDate, formatNumber } from "@/lib/format";
import { readAnalysis } from "@/lib/google-analysis";
import { LINK_TYPE_INFO, type LinkType } from "@/lib/link-types";
import { readMarketData } from "@/lib/market";
import { siteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBusinessReports } from "./actions";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

// Ao terminar a coleta, a conferência do relatório roda a comparação da IA (até ~2 min).
export const maxDuration = 300;

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** Análise do perfil do Google feita pela IA (sem a mensagem de venda, que é do painel). */
function ProfileAnalysis({ snapshot }: { snapshot?: { analysis: unknown; analyzed_at: string | null } }) {
  const analysis = readAnalysis(snapshot?.analysis);
  if (!analysis) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Seu perfil no Google <Badge variant="secondary">nota {analysis.nota}/100</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          O que já funciona e o que mudar para aparecer mais no Maps
          {snapshot?.analyzed_at && ` (análise de ${formatDate(snapshot.analyzed_at)})`}.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <AnalysisDetails analysis={analysis} />
      </CardContent>
    </Card>
  );
}

export default async function AccountPage() {
  const memberships = await listMemberships();
  // A equipe TopTap sem negócio próprio vai para o painel.
  if (memberships.length === 0 && (await isCurrentUserAdmin())) redirect("/dashboard");

  if (memberships.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum negócio ligado a este e-mail. Fale com a {siteConfig.name} para liberar o seu acesso.
        </CardContent>
      </Card>
    );
  }

  // Relatórios ainda gerando (o RLS do cliente só mostra os prontos): os negócios
  // vêm da participação, então a consulta com a chave secreta fica restrita a eles.
  const businessIds = memberships.flatMap(({ business }) => (business ? [business.id] : []));
  const { data: running } = businessIds.length
    ? await createAdminClient().from("market_reports").select("business_id").in("business_id", businessIds).eq("status", "running")
    : { data: [] };
  const generating = new Set(running?.map((r) => r.business_id));

  return (
    <div className="grid gap-10">
      {memberships.map(({ business }, i) =>
        !business ? (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 py-6 text-sm">
              <ClockIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <span>
                O seu acesso a um negócio está aguardando a aprovação da {siteConfig.name}. Assim que for liberado, ele aparece aqui.
              </span>
            </CardContent>
          </Card>
        ) : (
          <section key={business.id} className="grid gap-4">
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">{business.name}</h1>
              {business.plan_expires_at && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(business.plan_expires_at) > new Date()
                    ? `Monitoramento ativo até ${formatDate(business.plan_expires_at)}: um relatório novo por mês.`
                    : `O monitoramento terminou em ${formatDate(business.plan_expires_at)}. Fale com a ${siteConfig.name} para renovar.`}
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Relatórios mensais</CardTitle>
                <p className="text-sm text-muted-foreground">Sua posição no Google Maps, seus concorrentes e o que fazer para subir.</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                {generating.has(business.id) && (
                  <RunPoller
                    check={checkBusinessReports.bind(null, business.id)}
                    message="Estamos preparando o seu relatório: buscando os concorrentes no Google Maps. Ele aparece aqui assim que ficar pronto."
                  />
                )}
                {business.market_reports.length === 0 ? (
                  !generating.has(business.id) && (
                    <p className="text-sm text-muted-foreground">O primeiro relatório aparece aqui assim que ficar pronto.</p>
                  )
                ) : (
                  <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
                    {business.market_reports.map((r) => {
                      const data = readMarketData(r.data);
                      return (
                        <li key={r.id}>
                          <a
                            href={`/relatorio/${r.token}`}
                            className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/50"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium">{formatDate(r.created_at)}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                “{r.term}” em {r.area}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              {data && <Badge variant="secondary">{data.client.rank ? `${data.client.rank}º lugar` : "fora da lista"}</Badge>}
                              <ChevronRightIcon className="size-4 text-muted-foreground" />
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <ProfileAnalysis snapshot={business.place_snapshots[0]} />

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Peças</CardTitle>
                  <p className="text-sm text-muted-foreground">Quantas vezes os clientes tocaram ou leram o QR Code.</p>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm">
                    {business.cards.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-3">
                        <span>
                          {getProduct(c.batch?.product).kind === "plaque" ? "Placa" : "Cartão"}{" "}
                          <code className="text-xs text-muted-foreground">{c.code}</code>
                        </span>
                        <span className="tabular-nums">{plural(c.visit_count, "acesso", "acessos")}</span>
                      </li>
                    ))}
                    {business.cards.length === 0 && <li className="text-muted-foreground">Nenhuma peça ativada.</li>}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                  <p className="text-sm text-muted-foreground">Para onde as peças levam os clientes.</p>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 text-sm">
                    {business.links.map((l) => (
                      <li key={l.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate">{l.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {LINK_TYPE_INFO[l.type as LinkType]?.label ?? l.type}
                            {!l.is_active && " · desativado"}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">{plural(l.click_count, "acesso", "acessos")}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        ),
      )}
    </div>
  );
}
