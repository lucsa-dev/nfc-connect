import "server-only";
import {
  DEFAULT_MAPS_ACTOR,
  mapsActorInput,
  matchApifyItems,
  parseApifyPlace,
  SEARCH_RESULTS,
  searchActorInput,
  type ApifyPlaceItem,
  type MapsTarget,
} from "@/lib/apify-maps";
import type { PlaceProfile } from "@/lib/places";

/** Chamadas à API da Apify (o token nunca vai para o navegador). */

const API = "https://api.apify.com/v2";

export const apifyEnabled = () => Boolean(process.env.APIFY_TOKEN);
const actor = () => (process.env.APIFY_MAPS_ACTOR || DEFAULT_MAPS_ACTOR).replace("/", "~");
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${process.env.APIFY_TOKEN}` });

/**
 * Roda o scraper e espera o resultado (até ~4 min). Para poucos negócios:
 * ativação de um cartão e o botão "Atualizar dados".
 */
export async function scrapeMapsSync(targets: MapsTarget[]): Promise<Map<string, PlaceProfile>> {
  if (!apifyEnabled() || targets.length === 0) return new Map();
  try {
    const res = await fetch(`${API}/acts/${actor()}/run-sync-get-dataset-items?timeout=240&clean=true&format=json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(mapsActorInput(targets)),
      cache: "no-store",
      signal: AbortSignal.timeout(250_000),
    });
    if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text()}`);
    return matchApifyItems(targets, (await res.json()) as ApifyPlaceItem[]);
  } catch (error) {
    console.error("Falha no scraper do Google Maps (Apify)", error);
    return new Map();
  }
}

/** Busca negócios por texto ("Padaria Central Fortaleza"), para o quiz. Leva de 15 a 60 s. */
export async function searchMapsSync(query: string): Promise<PlaceProfile[] | null> {
  if (!apifyEnabled()) return null;
  try {
    const res = await fetch(`${API}/acts/${actor()}/run-sync-get-dataset-items?timeout=75&clean=true&format=json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(searchActorInput(query)),
      cache: "no-store",
      signal: AbortSignal.timeout(85_000),
    });
    if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text()}`);
    const items = (await res.json()) as ApifyPlaceItem[];
    return items
      .map(parseApifyPlace)
      .filter((p): p is PlaceProfile => p !== null)
      .slice(0, SEARCH_RESULTS);
  } catch (error) {
    console.error("Falha na busca do Google Maps (Apify)", error);
    return null;
  }
}

/**
 * Inicia o scraper sem esperar: ao terminar, a Apify chama `webhookUrl` com o
 * id do dataset. Usado no cron semanal (muitos negócios numa execução só).
 */
export async function startMapsRun(targets: MapsTarget[], webhookUrl: string): Promise<string | null> {
  if (!apifyEnabled() || targets.length === 0) return null;
  const webhooks = Buffer.from(
    JSON.stringify([{ eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT"], requestUrl: webhookUrl }]),
  ).toString("base64");
  const res = await fetch(`${API}/acts/${actor()}/runs?webhooks=${encodeURIComponent(webhooks)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(mapsActorInput(targets)),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: { id?: string } };
  return json.data?.id ?? null;
}

/** Itens de um dataset (resultado de uma execução), paginados. */
export async function getDatasetItems(datasetId: string): Promise<ApifyPlaceItem[]> {
  const items: ApifyPlaceItem[] = [];
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const res = await fetch(`${API}/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json&offset=${offset}&limit=${limit}`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Apify dataset ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as ApifyPlaceItem[];
    items.push(...page);
    if (page.length < limit) return items;
  }
}
