import type { PlaceProfile } from "@/lib/places";

/**
 * Google Maps Scraper da Apify (compass/crawler-google-places): montagem da
 * entrada e leitura dos itens. Sem dependências de servidor, para poder testar;
 * as chamadas ficam em src/lib/apify.ts.
 */

export const DEFAULT_MAPS_ACTOR = "compass~crawler-google-places";

/** Quantas avaliações recentes buscar por negócio (análise e taxa de resposta do dono). */
export const REVIEWS_PER_PLACE = 20;

export interface MapsTarget {
  businessId: string;
  name: string;
  placeId: string | null;
  /** "Nome, Cidade - UF", usado enquanto não há Place ID. */
  query: string | null;
}

/** Texto de busca de um negócio: pelo Place ID quando houver, senão pelo nome e cidade. */
export function searchStringFor(target: Pick<MapsTarget, "name" | "placeId" | "query">): string {
  if (target.placeId) return `place_id:${target.placeId}`;
  return (target.query || target.name).trim();
}

/** Entrada do Actor: uma busca por negócio, 1 resultado cada, avaliações mais recentes. */
export function mapsActorInput(targets: Array<Pick<MapsTarget, "name" | "placeId" | "query">>) {
  return {
    searchStringsArray: [...new Set(targets.map(searchStringFor))],
    maxCrawledPlacesPerSearch: 1,
    language: "pt-BR",
    countryCode: "br",
    maxReviews: REVIEWS_PER_PLACE,
    reviewsSort: "newest",
    scrapeReviewsPersonalData: false,
    scrapePlaceDetailPage: false,
    maxImages: 0,
    scrapeContacts: false,
  };
}

export interface ApifyPlaceItem {
  searchString?: string;
  title?: string;
  placeId?: string;
  url?: string;
  categoryName?: string;
  categories?: string[];
  address?: string;
  city?: string;
  state?: string;
  totalScore?: number | null;
  reviewsCount?: number | null;
  reviewsDistribution?: { oneStar?: number; twoStar?: number; threeStar?: number; fourStar?: number; fiveStar?: number };
  imagesCount?: number | null;
  website?: string | null;
  phone?: string | null;
  openingHours?: Array<{ day?: string; hours?: string }>;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  description?: string | null;
  price?: string | null;
  reviews?: Array<{ text?: string | null; stars?: number | null; publishedAtDate?: string | null; responseFromOwnerText?: string | null }>;
}

/** Converte um item do scraper no mesmo formato da Places API. */
export function parseApifyPlace(item: ApifyPlaceItem): PlaceProfile | null {
  if (!item.placeId || !item.title) return null;
  const reviews = item.reviews ?? [];
  const times = reviews
    .map((r) => r.publishedAtDate)
    .filter((t): t is string => Boolean(t) && !Number.isNaN(Date.parse(t!)))
    .sort();
  const d = item.reviewsDistribution;
  const replied = reviews.filter((r) => r.responseFromOwnerText?.trim()).length;

  return {
    placeId: item.placeId,
    name: item.title,
    address: item.address ?? null,
    city: item.city ?? null,
    state: item.state ?? null,
    rating: typeof item.totalScore === "number" ? item.totalScore : null,
    reviews: typeof item.reviewsCount === "number" ? item.reviewsCount : 0,
    category: item.categoryName ?? null,
    mapsUrl: item.url ?? null,
    businessStatus: item.permanentlyClosed ? "CLOSED_PERMANENTLY" : item.temporarilyClosed ? "CLOSED_TEMPORARILY" : "OPERATIONAL",
    lastReviewAt: times.length ? times[times.length - 1]! : null,
    types: item.categories ?? (item.categoryName ? [item.categoryName] : []),
    website: item.website || null,
    phone: item.phone || null,
    hours: (item.openingHours ?? []).filter((h) => h.day && h.hours).map((h) => `${h.day}: ${h.hours}`),
    photos: typeof item.imagesCount === "number" ? item.imagesCount : 0,
    photosCapped: false,
    ownerReplies: reviews.length ? { replied, total: reviews.length } : null,
    distribution: d ? [d.oneStar ?? 0, d.twoStar ?? 0, d.threeStar ?? 0, d.fourStar ?? 0, d.fiveStar ?? 0] : null,
    summary: item.description || null,
    priceLevel: item.price || null,
    sampleReviews: reviews.slice(0, 8).map((r) => ({
      rating: typeof r.stars === "number" ? r.stars : null,
      text: r.text?.slice(0, 600) || null,
      publishTime: r.publishedAtDate ?? null,
      ownerReplied: Boolean(r.responseFromOwnerText?.trim()),
    })),
  };
}

const STOPWORDS = new Set(["the", "and", "dos", "das", "de", "da", "do", "e", "ltda", "me", "eireli", "loja"]);

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * A busca por nome devolveu o negócio certo? Exige ao menos uma palavra em comum
 * entre o nome cadastrado e o título no Google (evita gravar outro negócio).
 */
export function namesMatch(expected: string, found: string): boolean {
  const a = new Set(words(expected));
  if (a.size === 0) return true;
  return words(found).some((w) => a.has(w));
}

/**
 * Associa os itens do scraper aos negócios. Busca por Place ID casa pelo
 * placeId; busca por nome casa pelo searchString e confere o nome.
 */
export function matchApifyItems(targets: MapsTarget[], items: ApifyPlaceItem[]): Map<string, PlaceProfile> {
  const result = new Map<string, PlaceProfile>();
  for (const target of targets) {
    const search = searchStringFor(target);
    const item = items.find((i) => (target.placeId && i.placeId === target.placeId) || i.searchString === search);
    const profile = item ? parseApifyPlace(item) : null;
    if (!profile) continue;
    if (!target.placeId && !namesMatch(target.name, profile.name)) continue;
    result.set(target.businessId, profile);
  }
  return result;
}
