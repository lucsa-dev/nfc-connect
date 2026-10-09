/**
 * Google Places API (New): montagem das requisições e leitura das respostas.
 * Sem dependências de servidor, para poder testar. As chamadas ficam nas
 * Server Actions do quiz (a chave nunca vai para o navegador).
 */

export const PLACES_BASE = "https://places.googleapis.com/v1";

/** Campos pedidos ao Place Details (cada campo influencia o custo da chamada). */
export const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "googleMapsUri",
  "businessStatus",
  "reviews",
].join(",");

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  secondary: string;
}

export interface PlaceInfo {
  placeId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  mapsUrl: string | null;
  businessStatus: string | null;
  /** Data (ISO) da avaliação mais recente entre as retornadas pelo Google. */
  lastReviewAt: string | null;
}

export function autocompleteBody(input: string, sessionToken: string) {
  return {
    input,
    sessionToken,
    languageCode: "pt-BR",
    includedRegionCodes: ["br"],
  };
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }>;
}

export function parseAutocomplete(json: AutocompleteResponse): PlaceSuggestion[] {
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId!,
      name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((p) => p.name)
    .slice(0, 5);
}

interface DetailsResponse {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  googleMapsUri?: string;
  businessStatus?: string;
  reviews?: Array<{ publishTime?: string }>;
}

export function parsePlaceDetails(json: DetailsResponse): PlaceInfo {
  const component = (type: string, short = false) => {
    const c = json.addressComponents?.find((a) => a.types?.includes(type));
    return (short ? c?.shortText : c?.longText) ?? null;
  };
  const times = (json.reviews ?? [])
    .map((r) => r.publishTime)
    .filter((t): t is string => Boolean(t) && !Number.isNaN(Date.parse(t!)))
    .sort();

  return {
    placeId: json.id ?? null,
    name: json.displayName?.text ?? "",
    address: json.formattedAddress ?? null,
    city: component("administrative_area_level_2") ?? component("locality"),
    state: component("administrative_area_level_1", true),
    rating: typeof json.rating === "number" ? json.rating : null,
    reviews: typeof json.userRatingCount === "number" ? json.userRatingCount : json.rating ? null : 0,
    category: json.primaryTypeDisplayName?.text ?? null,
    mapsUrl: json.googleMapsUri ?? null,
    businessStatus: json.businessStatus ?? null,
    lastReviewAt: times.length ? times[times.length - 1]! : null,
  };
}

/** Link oficial que abre direto a tela "Escrever avaliação" do negócio. */
export function reviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

// Perfil completo (ativação, painel e cron) ----------------------------------------

/** Campos para avaliar o perfil: tudo do Place Details mais contato, horário e fotos. */
export const PROFILE_FIELDS = [
  DETAILS_FIELDS,
  "types",
  "primaryType",
  "websiteUri",
  "nationalPhoneNumber",
  "regularOpeningHours.weekdayDescriptions",
  "photos",
  "editorialSummary",
  "priceLevel",
].join(",");

export interface PlaceReview {
  rating: number | null;
  text: string | null;
  publishTime: string | null;
  /** O dono respondeu? (só o scraper informa) */
  ownerReplied?: boolean;
}

export interface PlaceProfile extends PlaceInfo {
  placeId: string;
  types: string[];
  website: string | null;
  phone: string | null;
  /** Horário por dia da semana, como o Google mostra ("segunda-feira: 08:00–18:00"). */
  hours: string[];
  /** Quantidade de fotos. Na Places API o máximo é 10 (ver photosCapped). */
  photos: number;
  /** true: `photos` é limitado a 10 (Places API); false: total real (scraper). */
  photosCapped: boolean;
  /** Respostas do dono entre as avaliações coletadas (só o scraper informa). */
  ownerReplies: { replied: number; total: number } | null;
  /** Avaliações por estrela, de 1 a 5 (só o scraper informa). */
  distribution: [number, number, number, number, number] | null;
  summary: string | null;
  priceLevel: string | null;
  /** Até 5 avaliações em destaque (sem o nome do autor). */
  sampleReviews: PlaceReview[];
}

interface ProfileResponse extends DetailsResponse {
  id?: string;
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: unknown[];
  editorialSummary?: { text?: string };
  priceLevel?: string;
  reviews?: Array<{ publishTime?: string; rating?: number; text?: { text?: string }; originalText?: { text?: string } }>;
}

export function parsePlaceProfile(json: ProfileResponse): PlaceProfile | null {
  const info = parsePlaceDetails(json);
  if (!info.placeId) return null;
  return {
    ...info,
    placeId: info.placeId,
    types: json.types ?? [],
    website: json.websiteUri ?? null,
    phone: json.nationalPhoneNumber ?? null,
    hours: json.regularOpeningHours?.weekdayDescriptions ?? [],
    photos: json.photos?.length ?? 0,
    photosCapped: true,
    ownerReplies: null,
    distribution: null,
    summary: json.editorialSummary?.text ?? null,
    priceLevel: json.priceLevel ?? null,
    sampleReviews: (json.reviews ?? []).map((r) => ({
      rating: typeof r.rating === "number" ? r.rating : null,
      text: (r.originalText?.text ?? r.text?.text ?? "").slice(0, 600) || null,
      publishTime: r.publishTime ?? null,
    })),
  };
}

export const PLACE_ID_PATTERN = /^[\w-]{10,300}$/;

/** Lê um perfil salvo no banco (coluna jsonb); null se não tiver o mínimo. */
export function readPlaceProfile(value: unknown): PlaceProfile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<PlaceProfile>;
  if (typeof p.placeId !== "string" || typeof p.name !== "string") return null;
  return {
    placeId: p.placeId,
    name: p.name,
    address: p.address ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    rating: p.rating ?? null,
    reviews: p.reviews ?? null,
    category: p.category ?? null,
    mapsUrl: p.mapsUrl ?? null,
    businessStatus: p.businessStatus ?? null,
    lastReviewAt: p.lastReviewAt ?? null,
    types: Array.isArray(p.types) ? p.types : [],
    website: p.website ?? null,
    phone: p.phone ?? null,
    hours: Array.isArray(p.hours) ? p.hours : [],
    photos: typeof p.photos === "number" ? p.photos : 0,
    photosCapped: p.photosCapped ?? true,
    ownerReplies: p.ownerReplies ?? null,
    distribution: Array.isArray(p.distribution) && p.distribution.length === 5 ? p.distribution : null,
    summary: p.summary ?? null,
    priceLevel: p.priceLevel ?? null,
    sampleReviews: Array.isArray(p.sampleReviews) ? p.sampleReviews : [],
  };
}

/**
 * Link do Google colado pelo dono (sem a Places API): o "Pedir avaliações" do
 * Perfil da Empresa (g.page/r/.../review) ou um link do negócio no Maps.
 * Retorna a URL normalizada, ou null se não for um link do Google.
 */
export function normalizeGoogleReviewUrl(input: string): string | null {
  let value = input.trim();
  // Aceita o link no meio de um texto copiado ("Avalie a gente: https://g.page/...").
  const found = /https?:\/\/\S+/i.exec(value);
  if (found) value = found[0];
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname;
  const ok =
    (host === "g.page" && path.length > 1) ||
    (host === "maps.app.goo.gl" && path.length > 1) ||
    (host === "goo.gl" && path.startsWith("/maps")) ||
    host === "search.google.com" ||
    host === "maps.google.com" ||
    (/^google\.com(\.[a-z]{2})?$/.test(host) && path.startsWith("/maps"));
  if (!ok) return null;
  url.protocol = "https:";
  return url.toString();
}
