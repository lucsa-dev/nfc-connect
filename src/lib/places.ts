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
