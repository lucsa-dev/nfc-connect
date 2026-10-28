import { apifyEnabled, startMapsRun } from "@/lib/apify";
import { fetchPlaceProfile, storeProfiles, targetOf } from "@/lib/google";
import type { PlaceProfile } from "@/lib/places";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/urls";

/**
 * Coleta semanal de nota e avaliações de todos os negócios vinculados ao Google.
 * Agendado em vercel.json; a Vercel envia "Authorization: Bearer $CRON_SECRET".
 *
 * Places API (mais barata) para quem tem Place ID: coleta aqui. Quem ainda não
 * tem Place ID vai para uma execução do scraper da Apify, se configurado; o
 * resultado chega em /api/apify/webhook.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Pula quem já teve coleta nos últimos dias (cron repetido, botão "Atualizar"). */
const MIN_INTERVAL_MS = 5 * 86_400_000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  // Sem fonte de dados não há o que coletar: não é erro, só fica desligado.
  if (!apifyEnabled() && !process.env.GOOGLE_PLACES_API_KEY) {
    return Response.json({ ok: true, skipped: "Configure APIFY_TOKEN (ou GOOGLE_PLACES_API_KEY)" });
  }

  const supabase = createAdminClient();
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, place_id, maps_query")
    .or("place_id.not.is.null,maps_query.not.is.null");
  if (error) throw error;

  const since = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
  const { data: recent } = await supabase.from("place_snapshots").select("business_id").gte("created_at", since);
  const done = new Set((recent ?? []).map((r) => r.business_id));
  const targets = businesses.filter((b) => !done.has(b.id)).map(targetOf);

  const places = Boolean(process.env.GOOGLE_PLACES_API_KEY);
  const withPlace = places ? targets.filter((t) => t.placeId) : [];
  const forScraper = places ? targets.filter((t) => !t.placeId) : targets;

  let runId: string | null = null;
  if (apifyEnabled() && forScraper.length) {
    const webhookUrl = `${getSiteUrl()}/api/apify/webhook?secret=${encodeURIComponent(secret)}`;
    runId = await startMapsRun(forScraper, webhookUrl);
  }
  // collectProfiles cairia no scraper para quem a Places não devolveu; aqui não, para não rodar o scraper duas vezes.
  const profiles = new Map<string, PlaceProfile>();
  for (const t of withPlace) {
    const profile = await fetchPlaceProfile(t.placeId!);
    if (profile) profiles.set(t.businessId, profile);
  }
  const saved = await storeProfiles(supabase, withPlace, profiles);
  const result = { ok: true, total: businesses.length, skipped: done.size, saved, failed: withPlace.length - saved, queued: runId ? forScraper.length : 0, runId };
  console.log("Coleta do Google", result);
  return Response.json(result);
}
