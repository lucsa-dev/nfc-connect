"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { apifyEnabled, searchMapsSync } from "@/lib/apify";
import { normalizeSearchQuery } from "@/lib/apify-maps";
import type { Json } from "@/lib/database.types";
import { normalizeCep, parseIbgeCities, parseViaCep, searchCities, type CepInfo, type City } from "@/lib/br-location";
import { STYLES } from "@/lib/card";
import {
  autocompleteBody,
  DETAILS_FIELDS,
  parseAutocomplete,
  parsePlaceDetails,
  PLACES_BASE,
  type PlaceInfo,
  type PlaceSuggestion,
} from "@/lib/places";
import { CLIENT_BANDS, estimateTimeline, normalizeBrPhone, recommendKit, SPOTS } from "@/lib/quiz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, hashIp } from "@/lib/visit";

const apiKey = () => process.env.GOOGLE_PLACES_API_KEY;

// Busca no Google ----------------------------------------------------------------

export type SearchResult = { ok: true; suggestions: PlaceSuggestion[] } | { ok: false; reason: "indisponivel" | "erro" };

export async function searchPlaces(input: string, sessionToken: string): Promise<SearchResult> {
  const key = apiKey();
  if (!key) return { ok: false, reason: "indisponivel" };
  const query = input.trim().slice(0, 120);
  if (query.length < 3 || !z.uuid().safeParse(sessionToken).success) return { ok: true, suggestions: [] };

  try {
    const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify(autocompleteBody(query, sessionToken)),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Places autocomplete ${res.status}`);
    return { ok: true, suggestions: parseAutocomplete(await res.json()) };
  } catch (error) {
    console.error(error);
    return { ok: false, reason: "erro" };
  }
}

export async function getPlace(placeId: string, sessionToken: string): Promise<PlaceInfo | null> {
  const key = apiKey();
  if (!key || !/^[\w-]{10,300}$/.test(placeId)) return null;
  try {
    const params = new URLSearchParams({ languageCode: "pt-BR", regionCode: "BR" });
    if (z.uuid().safeParse(sessionToken).success) params.set("sessionToken", sessionToken);
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${params}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAILS_FIELDS },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Places details ${res.status}`);
    return parsePlaceDetails(await res.json());
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Busca pelo scraper (Apify), sem a Places API ------------------------------------

/** Buscas por visitante (IP) por hora: cada execução do scraper é cobrada. */
const MAPS_SEARCH_LIMIT = 5;
/** Resultado de uma busca reaproveitado por 7 dias. */
const MAPS_CACHE_MS = 7 * 86_400_000;

export type MapsSearchResult =
  | { ok: true; places: PlaceInfo[] }
  | { ok: false; reason: "indisponivel" | "limite" | "erro" };

/** Só o que o quiz usa (o perfil completo fica para o painel). */
function toPlaceInfo(p: PlaceInfo): PlaceInfo {
  return {
    placeId: p.placeId,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    rating: p.rating,
    reviews: p.reviews,
    category: p.category,
    mapsUrl: p.mapsUrl,
    businessStatus: p.businessStatus,
    lastReviewAt: p.lastReviewAt,
  };
}

export async function searchMaps(input: string): Promise<MapsSearchResult> {
  if (!apifyEnabled()) return { ok: false, reason: "indisponivel" };
  const query = normalizeSearchQuery(input);
  if (query.length < 3) return { ok: true, places: [] };

  const supabase = createAdminClient();
  const { data: cached } = await supabase
    .from("maps_searches")
    .select("results")
    .eq("query", query)
    .gte("created_at", new Date(Date.now() - MAPS_CACHE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached && Array.isArray(cached.results)) return { ok: true, places: (cached.results as unknown as PlaceInfo[]).map(toPlaceInfo) };

  const ip = getClientIp(await headers());
  const ipHash = ip ? await hashIp(ip, process.env.IP_HASH_SALT ?? "") : null;
  if (ipHash) {
    const { count } = await supabase
      .from("maps_searches")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) >= MAPS_SEARCH_LIMIT) return { ok: false, reason: "limite" };
  }

  const places = await searchMapsSync(input);
  if (!places) return { ok: false, reason: "erro" };
  const results = places.map(toPlaceInfo);
  const { error } = await supabase.from("maps_searches").insert({ query, ip_hash: ipHash, results: results as unknown as Json });
  if (error) console.error("Falha ao salvar busca do Maps", error);
  return { ok: true, places: results };
}

// Cidade e CEP -------------------------------------------------------------------

let citiesCache: Promise<City[]> | null = null;

/** Lista oficial de municípios do IBGE (em cache no servidor por 1 dia). */
function loadCities(): Promise<City[]> {
  citiesCache ??= fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado", {
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(8000),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`IBGE ${res.status}`);
      return res.json();
    })
    .then(parseIbgeCities)
    .catch((error) => {
      console.error("Falha ao carregar municípios do IBGE", error);
      citiesCache = null; // tenta de novo na próxima busca
      return [];
    });
  return citiesCache;
}

/** Pré-carrega a lista do IBGE quando o formulário manual abre. */
export async function warmCities(): Promise<void> {
  await loadCities();
}

export async function findCities(query: string): Promise<City[]> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  return searchCities(await loadCities(), q);
}

/** Cidade e UF a partir do CEP (ViaCEP). */
export async function lookupCep(input: string): Promise<CepInfo | null> {
  const cep = normalizeCep(input);
  if (!cep) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return parseViaCep(await res.json());
  } catch (error) {
    console.error("Falha ao consultar ViaCEP", error);
    return null;
  }
}

// Lead ---------------------------------------------------------------------------

const placeSchema = z.object({
  placeId: z.string().max(300).nullable(),
  name: z.string().trim().min(1).max(200),
  address: z.string().max(300).nullable(),
  city: z.string().max(120).nullable(),
  state: z.string().max(40).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  reviews: z.number().int().min(0).nullable(),
  category: z.string().max(120).nullable(),
  mapsUrl: z.url().max(500).nullable(),
  businessStatus: z.string().max(40).nullable(),
  lastReviewAt: z.iso.datetime({ offset: true }).nullable(),
});

const leadSchema = z.object({
  sessionId: z.uuid(),
  step: z.string().max(40),
  business: placeSchema.nullable(),
  goal: z.number().int().min(0).max(1_000_000).nullable(),
  spots: z.array(z.enum(SPOTS.map((s) => s.id) as [string, ...string[]])).max(SPOTS.length),
  clients: z.enum(CLIENT_BANDS.map((b) => b.id) as [string, ...string[]]).nullable(),
  counters: z.number().int().min(0).max(100),
  tables: z.number().int().min(0).max(500),
  style: z.enum(STYLES.map((s) => s.id) as [string, ...string[]]),
  // Quizzes salvos antes desta opção não têm o modelo: usa o padrão.
  plaqueModel: z.enum(["placa-quadrada", "placa-retangular"]).default("placa-quadrada"),
  cardModel: z.enum(["cartao", "cartao-vertical"]).default("cartao"),
  contact: z
    .object({
      name: z.string().trim().max(120),
      whatsapp: z.string().max(30),
      consent: z.boolean(),
    })
    .nullable(),
  utm: z.record(z.string().max(40), z.string().max(200)).default({}),
});

export type LeadPayload = z.input<typeof leadSchema>;

/** Salva o progresso do quiz. Kit, valor e prazo são recalculados aqui. */
export async function saveLead(payload: LeadPayload): Promise<{ ok: boolean; error?: string }> {
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const data = parsed.data;

  const whatsapp = data.contact?.whatsapp ? normalizeBrPhone(data.contact.whatsapp) : null;
  if (data.contact?.whatsapp && !whatsapp) return { ok: false, error: "WhatsApp inválido" };

  const kit = recommendKit({ spots: data.spots as never, counters: data.counters, tables: data.tables });
  const b = data.business;
  const supabase = createAdminClient();

  // Leads já tratados no painel não são alterados pelo quiz.
  const { data: existing, error: readError } = await supabase
    .from("leads")
    .select("status")
    .eq("session_id", data.sessionId)
    .maybeSingle();
  if (readError) console.error("Falha ao ler lead", { code: readError.code, message: readError.message });
  if (existing && (existing.status === "convertido" || existing.status === "descartado")) return { ok: true };

  const row = {
    session_id: data.sessionId,
    step: data.step,
    status: whatsapp ? "lead" : (existing?.status ?? "quiz"),
    place_id: b?.placeId ?? null,
    place_name: b?.name ?? null,
    place_address: b?.address ?? null,
    place_city: b?.city ?? null,
    place_state: b?.state ?? null,
    place_rating: b?.rating ?? null,
    place_reviews: b?.reviews ?? null,
    place_category: b?.category ?? null,
    place_maps_url: b?.mapsUrl ?? null,
    place_last_review_at: b?.lastReviewAt ?? null,
    goal: data.goal,
    spots: data.spots,
    clients_band: data.clients,
    counters: data.counters,
    tables: data.tables,
    style: data.style,
    // Modelo só faz sentido para o que está no kit.
    plaque_model: kit.plaques ? data.plaqueModel : null,
    card_model: kit.cards ? data.cardModel : null,
    plaques: kit.plaques,
    cards: kit.cards,
    total_cents: kit.totalCents,
    estimate: data.goal !== null ? estimateTimeline(b?.reviews ?? 0, data.goal, data.clients as never) : null,
    utm: data.utm,
    // Contato só é gravado quando enviado (não apaga o de um lead já salvo).
    ...(data.contact
      ? { contact_name: data.contact.name || null, whatsapp, marketing_consent: data.contact.consent }
      : {}),
  };

  const { error } = await supabase.from("leads").upsert(row, { onConflict: "session_id" });
  if (error) {
    console.error("Falha ao salvar lead", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    // Em desenvolvimento, mostra o motivo para facilitar o diagnóstico.
    const detail = process.env.NODE_ENV === "production" ? "" : ` (${error.code}: ${error.message})`;
    return { ok: false, error: `Não foi possível salvar${detail}` };
  }
  return { ok: true };
}
