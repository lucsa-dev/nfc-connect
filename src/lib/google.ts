import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type { MapsTarget } from "@/lib/apify-maps";
import { apifyEnabled, scrapeMapsSync } from "@/lib/apify";
import { analysisRequestBody, DEFAULT_OPENAI_MODEL, OPENAI_URL, parseAnalysisResponse, type Analysis } from "@/lib/google-analysis";
import { parsePlaceProfile, PLACE_ID_PATTERN, PLACES_BASE, PROFILE_FIELDS, type PlaceProfile } from "@/lib/places";

/**
 * Dados do Google Maps e análise da IA (as chaves nunca vão para o navegador).
 * Fonte das métricas: scraper da Apify (APIFY_TOKEN), ou a Google Places API.
 * A Places API, quando configurada, também habilita a busca do negócio na ativação.
 */

type Client = SupabaseClient<Database>;

export const placesEnabled = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);
export const analysisEnabled = () => Boolean(process.env.OPENAI_API_KEY);
export const metricsEnabled = () => apifyEnabled() || placesEnabled();

/**
 * Busca o perfil de alguns negócios agora (espera o resultado).
 * Com a Apify, sem Place ID busca por "nome, cidade"; com a Places API, só quem tem Place ID.
 */
export async function collectProfiles(targets: MapsTarget[]): Promise<Map<string, PlaceProfile>> {
  if (apifyEnabled()) return scrapeMapsSync(targets);
  const result = new Map<string, PlaceProfile>();
  for (const t of targets) {
    const profile = t.placeId ? await fetchPlaceProfile(t.placeId) : null;
    if (profile) result.set(t.businessId, profile);
  }
  return result;
}

/**
 * Grava as coletas: vincula o Place ID encontrado ao negócio (se ainda não tinha),
 * salva a coleta e, se pedido, roda a análise da IA. Devolve quantas salvou.
 */
export async function storeProfiles(
  supabase: Client,
  targets: MapsTarget[],
  profiles: Map<string, PlaceProfile>,
  { analyze = false } = {},
): Promise<number> {
  let saved = 0;
  for (const target of targets) {
    const profile = profiles.get(target.businessId);
    if (!profile) continue;
    if (!target.placeId) {
      const { error } = await supabase.from("businesses").update({ place_id: profile.placeId }).eq("id", target.businessId);
      // 23505: outro negócio do mesmo dono já tem este Place ID; salva a coleta mesmo assim.
      if (error && error.code !== "23505") console.error("Falha ao vincular Place ID", error);
    }
    const snapshotId = await saveSnapshot(supabase, target.businessId, profile);
    if (!snapshotId) continue;
    saved++;
    if (analyze) await analyzeSnapshot(supabase, snapshotId, profile);
  }
  return saved;
}

/** Alvo de coleta a partir de uma linha de businesses. */
export function targetOf(business: { id: string; name: string; place_id: string | null; maps_query: string | null }): MapsTarget {
  return { businessId: business.id, name: business.name, placeId: business.place_id, query: business.maps_query };
}

export async function fetchPlaceProfile(placeId: string): Promise<PlaceProfile | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !PLACE_ID_PATTERN.test(placeId)) return null;
  try {
    const params = new URLSearchParams({ languageCode: "pt-BR", regionCode: "BR" });
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${params}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": PROFILE_FIELDS },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Places details ${res.status}: ${await res.text()}`);
    return parsePlaceProfile(await res.json());
  } catch (error) {
    console.error("Falha ao buscar perfil no Google", error);
    return null;
  }
}

export async function analyzeProfile(profile: PlaceProfile): Promise<Analysis | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(analysisRequestBody(profile, process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL)),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const analysis = parseAnalysisResponse(await res.json());
    if (!analysis) throw new Error("OpenAI: resposta fora do formato esperado");
    return analysis;
  } catch (error) {
    console.error("Falha na análise da IA", error);
    return null;
  }
}

/** Grava uma coleta do perfil e devolve o id da linha. */
export async function saveSnapshot(supabase: Client, businessId: string, profile: PlaceProfile): Promise<number | null> {
  const { data, error } = await supabase
    .from("place_snapshots")
    .insert({
      business_id: businessId,
      place_id: profile.placeId,
      rating: profile.rating,
      reviews: profile.reviews,
      profile: profile as unknown as Json,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Falha ao salvar dados do Google", error);
    return null;
  }
  return data.id;
}

/** Roda a análise da IA e grava na coleta. */
export async function analyzeSnapshot(supabase: Client, snapshotId: number, profile: PlaceProfile): Promise<boolean> {
  const analysis = await analyzeProfile(profile);
  if (!analysis) return false;
  const { error } = await supabase
    .from("place_snapshots")
    .update({ analysis: analysis as unknown as Json, analyzed_at: new Date().toISOString() })
    .eq("id", snapshotId);
  if (error) console.error("Falha ao salvar análise", error);
  return !error;
}
