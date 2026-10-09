import { apifyEnabled, startMapsRun } from "@/lib/apify";
import { collectProfiles, storeProfiles, targetOf } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/urls";

/**
 * Coleta semanal de nota e avaliações de todos os negócios vinculados ao Google.
 * Agendado em vercel.json; a Vercel envia "Authorization: Bearer $CRON_SECRET".
 *
 * Com a Apify: inicia uma execução só do scraper com todos os negócios e
 * termina; o resultado chega em /api/apify/webhook. Com a Places API: coleta aqui.
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

  if (apifyEnabled()) {
    if (targets.length === 0) return Response.json({ ok: true, total: businesses.length, queued: 0 });
    const webhookUrl = `${getSiteUrl()}/api/apify/webhook?secret=${encodeURIComponent(secret)}`;
    const runId = await startMapsRun(targets, webhookUrl);
    const result = { ok: true, total: businesses.length, skipped: done.size, queued: targets.length, runId };
    console.log("Coleta do Google iniciada na Apify", result);
    return Response.json(result);
  }

  // Places API: só quem tem Place ID.
  const withPlace = targets.filter((t) => t.placeId);
  const saved = await storeProfiles(supabase, withPlace, await collectProfiles(withPlace));
  const result = { ok: true, total: businesses.length, skipped: done.size, saved, failed: withPlace.length - saved };
  console.log("Coleta do Google", result);
  return Response.json(result);
}
