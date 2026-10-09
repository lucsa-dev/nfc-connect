import { timingSafeEqual } from "node:crypto";
import { getDatasetItems } from "@/lib/apify";
import { matchApifyItems } from "@/lib/apify-maps";
import { storeProfiles, targetOf } from "@/lib/google";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fim de uma execução do scraper iniciada pelo cron (/api/cron/google):
 * lê o dataset, associa cada item ao negócio e grava as coletas.
 * A Apify chama esta URL com ?secret=CRON_SECRET (definido ao iniciar a execução).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function validSecret(received: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookPayload {
  eventType?: string;
  resource?: { id?: string; status?: string; defaultDatasetId?: string };
}

export async function POST(request: Request) {
  if (!validSecret(new URL(request.url).searchParams.get("secret"))) {
    return new Response("Não autorizado", { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as WebhookPayload;
  const run = payload.resource;
  if (run?.status !== "SUCCEEDED" || !run.defaultDatasetId) {
    console.error("Coleta do Google na Apify não terminou bem", { eventType: payload.eventType, runId: run?.id, status: run?.status });
    return Response.json({ ok: true, ignored: run?.status ?? "sem status" });
  }

  const supabase = createAdminClient();
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, place_id, maps_query")
    .or("place_id.not.is.null,maps_query.not.is.null");
  if (error) throw error;

  // A Apify reenvia o webhook se a resposta falhar: ignora quem já foi coletado agora há pouco.
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: recent } = await supabase.from("place_snapshots").select("business_id").gte("created_at", since);
  const done = new Set((recent ?? []).map((r) => r.business_id));
  const targets = businesses.filter((b) => !done.has(b.id)).map(targetOf);
  const items = await getDatasetItems(run.defaultDatasetId);
  const profiles = matchApifyItems(targets, items);
  const saved = await storeProfiles(supabase, targets, profiles);

  const result = { ok: true, runId: run.id, items: items.length, saved };
  console.log("Coleta do Google recebida da Apify", result);
  return Response.json(result);
}
