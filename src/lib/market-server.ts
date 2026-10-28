import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  contactOf,
  marketActorInput,
  NEARBY_ALL,
  nearbyActorInput,
  parseCompetitor,
  PROSPECT_PLACES,
  prospectActorInput,
  splitMarketItems,
} from "@/lib/apify-maps";
import { getDatasetItems, getRun, startRun } from "@/lib/apify";
import { notExpired } from "@/lib/data";
import { analysisEnabled, requestOpenAI } from "@/lib/google";
import { responseJson } from "@/lib/google-analysis";
import { computeGrowth } from "@/lib/growth";
import {
  competitorFromProfile,
  distanceMeters,
  formatDistance,
  monthlyReportSearch,
  rankProspects,
  readMarketData,
  type Competitor,
  type MarketData,
} from "@/lib/market";
import { marketAnalysisRequestBody, readMarketAnalysis, type MarketAnalysis } from "@/lib/market-analysis";
import { PLACE_ID_PATTERN, PLACES_BASE, PLACES_CACHE_DAYS, readPlaceProfile, type LatLng, type PlaceProfile } from "@/lib/places";
import {
  NEARBY_FIELD_MASK,
  NEARBY_TYPE_GROUPS,
  nearbyTextBody,
  nearbyTypesBody,
  PAGE_SIZE,
  parseSearchPage,
  prospectFromProfile,
  regionSearchBody,
  SEARCH_FIELD_MASK,
} from "@/lib/places-prospect";
import {
  GRID_FIELD_MASK,
  GRID_SIZE,
  GRID_SPACING_M,
  gridPoints,
  parseTextSearchIds,
  rankIn,
  textSearchBody,
  type GridPoint,
} from "@/lib/rank-grid";

/**
 * Relatório de concorrência, mapa de ranking e prospecção (servidor).
 * O scraper roda em segundo plano na Apify; o painel chama syncReport/syncProspect
 * a cada poucos segundos até terminar, sem depender de webhook.
 */

type Client = SupabaseClient<Database>;
type Status = "running" | "ready" | "failed";

const DAY = 86_400_000;

// Relatório --------------------------------------------------------------------------

export interface ReportInput {
  businessId: string | null;
  placeId: string;
  name: string;
  term: string;
  area: string;
  /** Dono do relatório quando não há usuário logado (cron). */
  ownerId?: string;
}

/** Inicia a coleta dos concorrentes e cria o relatório (status "running"). */
export async function startReport(supabase: Client, input: ReportInput): Promise<string> {
  const runId = await startRun(marketActorInput(input.term, input.area, input.placeId));
  const { data, error } = await supabase
    .from("market_reports")
    .insert({
      ...(input.ownerId && { owner_id: input.ownerId }),
      business_id: input.businessId,
      place_id: input.placeId,
      name: input.name.slice(0, 200),
      term: input.term,
      area: input.area,
      run_id: runId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Confere a execução na Apify e, se terminou, monta e grava o relatório. */
export async function syncReport(supabase: Client, reportId: string): Promise<Status> {
  const { data: report, error } = await supabase.from("market_reports").select("*").eq("id", reportId).maybeSingle();
  if (error || !report) throw error ?? new Error("Relatório não encontrado");
  if (report.status !== "running") return report.status as Status;

  const fail = async (message: string) => {
    await supabase
      .from("market_reports")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
      .eq("id", reportId)
      .eq("status", "running");
    return "failed" as const;
  };

  if (!report.run_id) return fail("Execução não iniciada.");
  const run = await getRun(report.run_id);
  if (run.state === "running") return "running";
  if (run.state === "failed" || !run.datasetId) return fail("A busca no Google Maps falhou. Tente de novo.");

  const now = new Date();
  const items = await getDatasetItems(run.datasetId);
  const split = splitMarketItems(items, report.place_id, now);
  const client = split.client ?? (await clientFromSnapshot(supabase, report.business_id, now));
  if (!client) return fail("O negócio não foi encontrado no Google Maps.");

  const growth = report.business_id ? await businessGrowth(supabase, report.business_id) : null;
  const previous = await previousReport(supabase, report);
  const data: MarketData = {
    version: 1,
    generatedAt: now.toISOString(),
    term: report.term,
    area: report.area,
    client,
    competitors: split.competitors,
    clientPaceFromSnapshots: growth?.reviews30d ?? null,
    benchmarkPace: await benchmarkPace(supabase),
    plate: report.business_id ? await plateResults(supabase, report.business_id, growth?.reviews30d ?? null) : null,
    previousRank: previous?.rank ?? null,
    previousAt: previous?.at ?? null,
  };
  const analysis = analysisEnabled() ? await analyzeMarket(data) : null;

  const { error: saveError } = await supabase
    .from("market_reports")
    .update({
      status: "ready",
      data: data as unknown as Json,
      analysis: analysis as unknown as Json,
      finished_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "running");
  if (saveError) throw saveError;
  return "ready";
}

/**
 * Relatório mensal dos clientes com plano valendo: finaliza os que ainda estão
 * gerando e inicia um novo para quem teve o último há 30 dias ou mais, com a
 * mesma busca (termo e região) do último relatório pronto. Sem relatório
 * anterior não há busca para repetir: o primeiro sai na ativação da peça ou
 * é gerado no painel.
 */
export async function runMonthlyReports(supabase: Client, now = new Date()) {
  const { data: running } = await supabase
    .from("market_reports")
    .select("id")
    .eq("status", "running")
    .not("business_id", "is", null);
  let finished = 0;
  for (const r of running ?? []) {
    const status = await syncReport(supabase, r.id).catch((error) => {
      console.error("Falha ao conferir o relatório", r.id, error);
      return "running" as const;
    });
    if (status !== "running") finished++;
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, owner_id, name, place_id, market_reports(term, area, status, created_at)")
    .gt("plan_expires_at", now.toISOString())
    .not("place_id", "is", null);
  if (error) throw error;

  let started = 0;
  const skipped: string[] = [];
  for (const b of businesses) {
    const search = monthlyReportSearch(b.market_reports, now);
    if (!search) continue;
    if (search === "sem_base") {
      skipped.push(b.name);
      continue;
    }
    try {
      await startReport(supabase, {
        businessId: b.id,
        placeId: b.place_id!,
        name: b.name,
        ...search,
        ownerId: b.owner_id,
      });
      started++;
    } catch (error) {
      console.error("Falha ao iniciar o relatório mensal", b.id, error);
    }
  }
  return { plans: businesses.length, finished, started, withoutReport: skipped };
}

export async function analyzeMarket(data: MarketData): Promise<MarketAnalysis | null> {
  const json = await requestOpenAI((model) => marketAnalysisRequestBody(data, model), "comparação com os concorrentes");
  const analysis = json ? readMarketAnalysis(responseJson(json)) : null;
  if (json && !analysis) console.error("OpenAI: comparação fora do formato esperado");
  return analysis;
}

/** Dados do negócio pela última coleta, quando ele não veio na execução. */
async function clientFromSnapshot(supabase: Client, businessId: string | null, now: Date): Promise<Competitor | null> {
  if (!businessId) return null;
  const { data } = await supabase
    .from("place_snapshots")
    .select("profile")
    .eq("business_id", businessId)
    .or(notExpired(now))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const profile = data ? readPlaceProfile(data.profile) : null;
  return profile ? competitorFromProfile(profile, null, now) : null;
}

async function businessGrowth(supabase: Client, businessId: string) {
  const since = new Date(Date.now() - 120 * DAY).toISOString();
  const { data } = await supabase
    .from("place_snapshots")
    .select("business_id, created_at, rating, reviews")
    .eq("business_id", businessId)
    .gte("created_at", since)
    .or(notExpired());
  return computeGrowth(data ?? []).get(businessId) ?? null;
}

/** Mínimo de clientes com dados para usar a média como referência. */
const BENCHMARK_MIN = 3;

/**
 * Ritmo médio (avaliações novas em 30 dias) dos negócios que têm link de
 * avaliação com acessos, ou seja, que usam a placa ou o cartão.
 */
export async function benchmarkPace(supabase: Client): Promise<number | null> {
  const { data: links } = await supabase.from("links").select("business_id").eq("type", "review").gt("click_count", 0);
  const ids = [...new Set((links ?? []).map((l) => l.business_id))];
  if (ids.length < BENCHMARK_MIN) return null;
  const since = new Date(Date.now() - 60 * DAY).toISOString();
  const { data } = await supabase
    .from("place_snapshots")
    .select("business_id, created_at, rating, reviews")
    .in("business_id", ids)
    .gte("created_at", since)
    .or(notExpired())
    .limit(5000);
  const values = [...computeGrowth(data ?? []).values()].map((g) => g.reviews30d).filter((v): v is number => v !== null && v >= 0);
  if (values.length < BENCHMARK_MIN) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Toques na placa (links de avaliação, sem robôs) e avaliações novas em 30 dias. */
async function plateResults(supabase: Client, businessId: string, reviews30d: number | null) {
  const { data: links } = await supabase.from("links").select("id").eq("business_id", businessId).eq("type", "review");
  if (!links?.length) return null;
  const { count } = await supabase
    .from("link_visits")
    .select("id", { count: "exact", head: true })
    .in(
      "link_id",
      links.map((l) => l.id),
    )
    .eq("is_bot", false)
    .gte("created_at", new Date(Date.now() - 30 * DAY).toISOString());
  return { taps30d: count ?? 0, reviews30d };
}

async function previousReport(supabase: Client, report: { id: string; place_id: string; term: string; area: string }) {
  const { data } = await supabase
    .from("market_reports")
    .select("data, created_at")
    .eq("place_id", report.place_id)
    .eq("term", report.term)
    .eq("area", report.area)
    .eq("status", "ready")
    .neq("id", report.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const previous = data ? readMarketData(data.data) : null;
  return previous && data ? { rank: previous.client.rank, at: data.created_at } : null;
}

// Mapa de ranking (Places API) ----------------------------------------------------------

const placesKey = () => process.env.GOOGLE_PLACES_API_KEY;

async function placesFetch(path: string, init: { method?: string; fieldMask: string; body?: object }) {
  const res = await fetch(`${PLACES_BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": placesKey()!, "X-Goog-FieldMask": init.fieldMask },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Coordenadas do negócio pela Places API (campo location, SKU Essentials). */
async function fetchLocation(placeId: string): Promise<LatLng | null> {
  if (!PLACE_ID_PATTERN.test(placeId)) return null;
  const json = (await placesFetch(`/places/${encodeURIComponent(placeId)}`, { fieldMask: "location" })) as {
    location?: { latitude?: number; longitude?: number };
  };
  const { latitude, longitude } = json.location ?? {};
  return typeof latitude === "number" && typeof longitude === "number" ? { lat: latitude, lng: longitude } : null;
}

/** Pontos consultados ao mesmo tempo (a cota padrão da Places API é folgada). */
const GRID_CONCURRENCY = 5;

/** Faz a busca em cada ponto da grade e grava o mapa (expira em 30 dias). */
export async function runRankGrid(supabase: Client, reportId: string): Promise<{ ok: boolean; message: string }> {
  if (!placesKey()) return { ok: false, message: "Configure a variável GOOGLE_PLACES_API_KEY para gerar o mapa." };
  const { data: report } = await supabase.from("market_reports").select("id, place_id, term, data").eq("id", reportId).maybeSingle();
  const data = report ? readMarketData(report.data) : null;
  if (!report || !data) return { ok: false, message: "Gere o relatório antes do mapa." };

  try {
    const center = data.client.location ?? (await fetchLocation(report.place_id));
    if (!center) return { ok: false, message: "Não foi possível achar a localização do negócio." };

    const base = gridPoints(center, GRID_SIZE, GRID_SPACING_M);
    const points: GridPoint[] = [];
    for (let i = 0; i < base.length; i += GRID_CONCURRENCY) {
      const batch = await Promise.all(
        base.slice(i, i + GRID_CONCURRENCY).map(async (p) => {
          const ids = parseTextSearchIds(
            await placesFetch("/places:searchText", { method: "POST", fieldMask: GRID_FIELD_MASK, body: textSearchBody(report.term, p) }),
          );
          return { ...p, rank: rankIn(ids, report.place_id), top: ids.slice(0, 3) };
        }),
      );
      points.push(...batch);
    }

    const { error } = await supabase.from("rank_grids").insert({
      report_id: reportId,
      term: report.term,
      center_lat: center.lat,
      center_lng: center.lng,
      spacing_m: GRID_SPACING_M,
      size: GRID_SIZE,
      points: points as unknown as Json,
    });
    if (error) throw error;
    return { ok: true, message: "Mapa de ranking pronto." };
  } catch (error) {
    console.error("Falha no mapa de ranking", error);
    return { ok: false, message: "A busca na Places API falhou. Confira a chave em Configurações." };
  }
}

// Prospecção -----------------------------------------------------------------------------

export type ProspectInput =
  | { term: string; area: string }
  /** Perto de mim: term null busca os tipos de NEARBY_TERMS. */
  | { term: string | null; center: LatLng; radiusM: number };

/**
 * Inicia a prospecção. Com a Places API (mais barata), a busca termina na hora
 * e a linha já nasce pronta; sem ela, roda o scraper em segundo plano.
 */
export async function startProspect(supabase: Client, input: ProspectInput): Promise<string> {
  if (placesKey()) return createPlacesProspect(supabase, input);
  const nearby = "center" in input;
  const runId = await startRun(nearby ? nearbyActorInput(input.term, input.center, input.radiusM) : prospectActorInput(input.term, input.area));
  const { data, error } = await supabase
    .from("prospect_searches")
    .insert(
      nearby
        ? {
            term: input.term ?? NEARBY_ALL,
            area: `até ${formatDistance(input.radiusM)} de você`,
            center_lat: input.center.lat,
            center_lng: input.center.lng,
            radius_m: input.radiusM,
            run_id: runId,
          }
        : { term: input.term, area: input.area, run_id: runId },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** O scraper pode trazer lugares um pouco fora do círculo; aceita até 50% a mais. */
const NEARBY_SLACK = 1.5;

/** Text Search página a página (o token da próxima vem na resposta). */
async function textSearchPages(body: (pageToken?: string) => object, limit: number): Promise<PlaceProfile[]> {
  const profiles: PlaceProfile[] = [];
  let token: string | undefined;
  do {
    const page = parseSearchPage(await placesFetch("/places:searchText", { method: "POST", fieldMask: SEARCH_FIELD_MASK, body: body(token) }));
    profiles.push(...page.profiles);
    token = page.nextPageToken ?? undefined;
  } while (token && profiles.length < limit);
  return profiles.slice(0, limit);
}

async function createPlacesProspect(supabase: Client, input: ProspectInput): Promise<string> {
  const now = new Date();
  const nearby = "center" in input;
  let profiles: Array<{ profile: PlaceProfile; rank: number | null }>;
  if (!nearby) {
    profiles = (await textSearchPages((t) => regionSearchBody(input.term, input.area, t), PROSPECT_PLACES)).map((profile, i) => ({ profile, rank: i + 1 }));
  } else if (input.term) {
    const term = input.term;
    profiles = (await textSearchPages((t) => nearbyTextBody(term, input.center, input.radiusM, t), PROSPECT_PLACES)).map((profile) => ({ profile, rank: null }));
  } else {
    const groups = await Promise.all(
      NEARBY_TYPE_GROUPS.map((types) =>
        placesFetch("/places:searchNearby", { method: "POST", fieldMask: NEARBY_FIELD_MASK, body: nearbyTypesBody(types, input.center, input.radiusM) }),
      ),
    );
    profiles = groups.flatMap((json) => parseSearchPage(json).profiles.slice(0, PAGE_SIZE)).map((profile) => ({ profile, rank: null }));
  }

  const center = nearby ? input.center : null;
  const seen = new Set<string>();
  const found = profiles
    .filter(({ profile }) => !seen.has(profile.placeId) && Boolean(seen.add(profile.placeId)))
    .map(({ profile, rank }) => {
      const p = prospectFromProfile(profile, rank, now);
      return { ...p, distanceM: center && p.location ? distanceMeters(center, p.location) : null };
    })
    .filter((p) => !nearby || p.distanceM === null || p.distanceM <= input.radiusM * NEARBY_SLACK);
  const prospects = rankProspects(found, now).map((p) => ({ ...p, recent: p.recent.map((r) => ({ ...r, text: null })) }));

  const { data, error } = await supabase
    .from("prospect_searches")
    .insert({
      ...(nearby
        ? {
            term: input.term ?? NEARBY_ALL,
            area: `até ${formatDistance(input.radiusM)} de você`,
            center_lat: input.center.lat,
            center_lng: input.center.lng,
            radius_m: input.radiusM,
          }
        : { term: input.term, area: input.area }),
      status: "ready",
      results: prospects as unknown as Json,
      finished_at: now.toISOString(),
      // Conteúdo da Places API: no máximo 30 dias guardado.
      expires_at: new Date(now.getTime() + PLACES_CACHE_DAYS * DAY).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function syncProspect(supabase: Client, searchId: string): Promise<Status> {
  const { data: search, error } = await supabase.from("prospect_searches").select("*").eq("id", searchId).maybeSingle();
  if (error || !search) throw error ?? new Error("Prospecção não encontrada");
  if (search.status !== "running") return search.status as Status;

  const finish = async (values: Database["public"]["Tables"]["prospect_searches"]["Update"]) => {
    await supabase
      .from("prospect_searches")
      .update({ ...values, finished_at: new Date().toISOString() })
      .eq("id", searchId)
      .eq("status", "running");
  };

  const run = search.run_id ? await getRun(search.run_id) : { state: "failed" as const, datasetId: null };
  if (run.state === "running") return "running";
  if (run.state === "failed" || !run.datasetId) {
    await finish({ status: "failed", error: "A busca no Google Maps falhou. Tente de novo." });
    return "failed";
  }

  const now = new Date();
  const seen = new Set<string>();
  const found = (await getDatasetItems(run.datasetId))
    .map((item) => {
      const c = parseCompetitor(item, now);
      return c && { ...c, contact: contactOf(item) };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && !seen.has(c.placeId) && Boolean(seen.add(c.placeId)));
  const center = search.center_lat !== null && search.center_lng !== null ? { lat: search.center_lat, lng: search.center_lng } : null;
  const near = found
    .map((c) => ({ ...c, distanceM: center && c.location ? distanceMeters(center, c.location) : null }))
    .filter((c) => !center || !search.radius_m || c.distanceM === null || c.distanceM <= search.radius_m * NEARBY_SLACK);
  // Os textos das avaliações não são usados na lista: guarda só datas e estrelas.
  const prospects = rankProspects(near).map((p) => ({ ...p, recent: p.recent.map((r) => ({ ...r, text: null })) }));
  await finish({ status: "ready", results: prospects as unknown as Json });
  return "ready";
}

// Limpeza --------------------------------------------------------------------------------

/** Apaga o conteúdo da Places API com mais de 30 dias (rodado pelo cron diário). */
export async function purgeExpired(supabase: Client) {
  const now = new Date().toISOString();
  const grids = await supabase.from("rank_grids").delete({ count: "exact" }).lt("expires_at", now);
  const snapshots = await supabase.from("place_snapshots").delete({ count: "exact" }).lt("expires_at", now);
  const searches = await supabase.from("prospect_searches").delete({ count: "exact" }).lt("expires_at", now);
  if (grids.error) throw grids.error;
  if (snapshots.error) throw snapshots.error;
  if (searches.error) throw searches.error;
  return { rankGrids: grids.count ?? 0, placeSnapshots: snapshots.count ?? 0, prospectSearches: searches.count ?? 0 };
}
