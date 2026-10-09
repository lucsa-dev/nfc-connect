import { CheckIcon, ExternalLinkIcon, MapPinIcon, StarIcon, XIcon } from "lucide-react";
import { GoogleActions, GoogleLinkForm } from "@/components/dashboard/google-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { readAnalysis, type Analysis } from "@/lib/google-analysis";
import { profileChecks, profileScore } from "@/lib/google-score";
import { computeGrowth } from "@/lib/growth";
import { readPlaceProfile } from "@/lib/places";

interface Snapshot {
  id: number;
  created_at: string;
  rating: number | null;
  reviews: number | null;
  profile: unknown;
  analysis: unknown;
  analyzed_at: string | null;
}

const IMPACT: Record<Analysis["melhorias"][number]["impacto"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  alto: { label: "Impacto alto", variant: "default" },
  medio: { label: "Impacto médio", variant: "secondary" },
  baixo: { label: "Impacto baixo", variant: "outline" },
};

const signed = (n: number) => (n > 0 ? `+${formatNumber(n)}` : formatNumber(n));

function Stat({ label, value, delta }: { label: string; value: string; delta?: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {delta && <span className="text-xs text-muted-foreground tabular-nums">{delta}</span>}
    </div>
  );
}

/** Seção "Google Maps" da página do negócio: métricas, checklist e análise da IA. */
export function GooglePanel({
  business,
  snapshots,
  placesEnabled,
  metricsEnabled,
  analysisEnabled,
}: {
  business: { id: string; name: string; place_id: string | null; maps_query: string | null; description: string | null };
  /** Mais recentes primeiro. */
  snapshots: Snapshot[];
  /** Busca do negócio pela Places API (senão, por texto no scraper). */
  placesEnabled: boolean;
  /** Há fonte de métricas (Apify ou Places API)? */
  metricsEnabled: boolean;
  analysisEnabled: boolean;
}) {
  const businessId = business.id;
  const placeId = business.place_id;

  if (!metricsEnabled) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Google Maps</CardTitle>
          <p className="text-sm text-muted-foreground">
            Nota, avaliações, evolução semanal e análise do perfil com IA precisam de uma fonte de dados do Google. Configure a
            variável APIFY_TOKEN (scraper do Google Maps).
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (!placeId && snapshots.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Google Maps</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vincule este negócio ao Google para acompanhar nota e avaliações toda semana e gerar a análise do perfil.
          </p>
        </CardHeader>
        <CardContent>
          {business.maps_query && (
            <p className="mb-3 text-sm text-muted-foreground">
              Buscando por “{business.maps_query}”. Se a coleta não aparecer em alguns minutos, ajuste o texto abaixo.
            </p>
          )}
          <GoogleLinkForm
            businessId={businessId}
            placesEnabled={placesEnabled}
            defaultQuery={business.maps_query ?? [business.name, business.description].filter(Boolean).join(", ").slice(0, 200)}
          />
        </CardContent>
      </Card>
    );
  }

  const latest = snapshots[0];
  const profile = latest ? readPlaceProfile(latest.profile) : null;
  const analysis = snapshots.map((s) => readAnalysis(s.analysis)).find(Boolean) ?? null;
  const analyzedAt = snapshots.find((s) => readAnalysis(s.analysis))?.analyzed_at ?? null;
  const growth = computeGrowth(snapshots.map((s) => ({ ...s, business_id: businessId }))).get(businessId);
  const checks = profile ? profileChecks(profile) : [];

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Google Maps</CardTitle>
          <p className="text-sm text-muted-foreground">
            {latest ? `Atualizado em ${formatDateTime(latest.created_at)}. Coleta automática toda semana.` : "Ainda sem dados coletados."}
          </p>
        </div>
        <GoogleActions businessId={businessId} canAnalyze={analysisEnabled && Boolean(profile)} hasAnalysis={Boolean(analysis)} />
      </CardHeader>

      {profile && (
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Nota"
              value={profile.rating !== null ? profile.rating.toFixed(1).replace(".", ",") : "—"}
              delta={growth?.ratingTotal ? `${growth.ratingTotal > 0 ? "+" : ""}${growth.ratingTotal.toFixed(1).replace(".", ",")} desde ${formatDate(growth.firstAt)}` : null}
            />
            <Stat
              label="Avaliações"
              value={formatNumber(profile.reviews ?? 0)}
              delta={growth?.reviewsTotal !== null && growth?.reviewsTotal !== undefined ? `${signed(growth.reviewsTotal)} desde ${formatDate(growth.firstAt)}` : null}
            />
            <Stat label="Últimos 30 dias" value={growth?.reviews30d !== null && growth?.reviews30d !== undefined ? signed(growth.reviews30d) : "—"} />
            <Stat label="Perfil completo" value={`${profileScore(checks)}%`} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{profile.name}</span>
            {profile.category && <span>{profile.category}</span>}
            {profile.address && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {profile.address}
              </span>
            )}
            {profile.mapsUrl && (
              <a href={profile.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                Ver no Google Maps <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid content-start gap-2">
              <h3 className="text-sm font-medium">Checklist do perfil</h3>
              <ul className="grid gap-2">
                {checks.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm">
                    {c.ok ? (
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#34A853]" aria-label="OK" />
                    ) : (
                      <XIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Pendente" />
                    )}
                    <span>
                      {c.label}
                      {!c.ok && <span className="block text-xs text-muted-foreground">{c.tip}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid content-start gap-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                Análise da IA
                {analysis && <Badge variant="secondary">nota {analysis.nota}/100</Badge>}
              </h3>
              {analysis ? (
                <>
                  <p className="text-sm">{analysis.resumo}</p>
                  {analysis.pontos_fortes.length > 0 && (
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Pontos fortes</span>
                      <ul className="grid gap-1 text-sm">
                        {analysis.pontos_fortes.map((p) => (
                          <li key={p} className="flex gap-2">
                            <StarIcon className="mt-0.5 size-3.5 shrink-0 fill-[#FBBC05] text-[#FBBC05]" /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">O que melhorar</span>
                    <ol className="grid gap-2">
                      {analysis.melhorias.map((m) => (
                        <li key={m.titulo} className="grid gap-0.5 rounded-lg bg-muted/60 p-3 text-sm">
                          <span className="flex flex-wrap items-center gap-2 font-medium">
                            {m.titulo} <Badge variant={IMPACT[m.impacto].variant}>{IMPACT[m.impacto].label}</Badge>
                          </span>
                          <span className="text-muted-foreground">{m.detalhe}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="grid gap-1 rounded-lg p-3 ring-1 ring-primary/30">
                    <span className="text-xs font-medium text-primary">Mensagem para oferecer o serviço</span>
                    <p className="text-sm">{analysis.argumento_venda}</p>
                  </div>
                  {analyzedAt && <p className="text-xs text-muted-foreground">Gerada em {formatDateTime(analyzedAt)}.</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {analysisEnabled
                    ? "Ainda sem análise. Clique em “Analisar com IA” (leva alguns segundos)."
                    : "Configure a variável OPENAI_API_KEY para gerar a análise do perfil com IA."}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
