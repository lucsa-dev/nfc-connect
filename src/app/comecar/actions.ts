"use server";

import { z } from "zod";
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
