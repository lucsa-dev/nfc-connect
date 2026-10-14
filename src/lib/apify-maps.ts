import { competitorFromProfile, estimatePace, type Competitor } from "@/lib/market";
import { readLatLng, type PlaceProfile } from "@/lib/places";

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
  /** Posição do lugar no resultado da busca (1 = primeiro). */
  rank?: number | null;
  location?: { lat?: number; lng?: number } | null;
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
    location: readLatLng(item.location),
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

// Busca do negócio no quiz ---------------------------------------------------------

/** Até quantos negócios mostrar na busca do quiz. */
export const SEARCH_RESULTS = 3;

/** Normaliza o texto da busca para o cache ("Padaria  São João " -> "padaria sao joao"). */
export function normalizeSearchQuery(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Entrada do Actor para achar o negócio: poucos resultados e sem avaliações (mais rápido e barato). */
export function searchActorInput(query: string) {
  return {
    searchStringsArray: [query.trim().slice(0, 200)],
    maxCrawledPlacesPerSearch: SEARCH_RESULTS,
    language: "pt-BR",
    countryCode: "br",
    maxReviews: 0,
    scrapePlaceDetailPage: false,
    maxImages: 0,
    scrapeContacts: false,
  };
}

// Concorrência e prospecção -------------------------------------------------------

/** Quantos negócios coletar na busca de concorrentes e na prospecção. */
export const MARKET_PLACES = 15;
export const PROSPECT_PLACES = 40;
/** Avaliações por negócio: o bastante para estimar o ritmo e ler as reclamações. */
export const MARKET_REVIEWS = 20;
export const PROSPECT_REVIEWS = 10;

/** Texto da busca como o cliente digitaria no Maps: "padaria em Aldeota, Fortaleza". */
export function marketQuery(term: string, area: string): string {
  return `${term.trim()} em ${area.trim()}`.slice(0, 200);
}

/**
 * Busca dos concorrentes e, na mesma execução, o próprio negócio pelo Place ID
 * (para ter os dados dele mesmo quando não aparece entre os primeiros).
 */
export function marketActorInput(term: string, area: string, placeId: string) {
  return {
    searchStringsArray: [marketQuery(term, area), `place_id:${placeId}`],
    maxCrawledPlacesPerSearch: MARKET_PLACES,
    language: "pt-BR",
    countryCode: "br",
    maxReviews: MARKET_REVIEWS,
    reviewsSort: "newest",
    scrapeReviewsPersonalData: false,
    scrapePlaceDetailPage: false,
    maxImages: 0,
    scrapeContacts: false,
  };
}

export function prospectActorInput(term: string, area: string) {
  return {
    searchStringsArray: [marketQuery(term, area)],
    maxCrawledPlacesPerSearch: PROSPECT_PLACES,
    language: "pt-BR",
    countryCode: "br",
    maxReviews: PROSPECT_REVIEWS,
    reviewsSort: "newest",
    scrapeReviewsPersonalData: false,
    scrapePlaceDetailPage: false,
    maxImages: 0,
    scrapeContacts: false,
  };
}

/** Item do scraper como Competitor (todas as avaliações coletadas, não só 8). */
export function parseCompetitor(item: ApifyPlaceItem, now = new Date()): (Competitor & { closed: boolean }) | null {
  const profile = parseApifyPlace(item);
  if (!profile) return null;
  const recent = (item.reviews ?? []).map((r) => ({
    stars: typeof r.stars === "number" ? r.stars : null,
    date: r.publishedAtDate ?? null,
    replied: Boolean(r.responseFromOwnerText?.trim()),
    text: r.text?.trim().slice(0, 400) || null,
  }));
  const base = competitorFromProfile(profile, typeof item.rank === "number" ? item.rank : null, now);
  return {
    ...base,
    recent,
    pace: estimatePace(recent.map((r) => r.date), base.reviews, now),
    closed: profile.businessStatus !== "OPERATIONAL",
  };
}

/**
 * Separa o resultado da execução do relatório: o negócio (busca por Place ID,
 * com a posição que ele teve na busca do termo, se apareceu) e os concorrentes.
 */
export function splitMarketItems(
  items: ApifyPlaceItem[],
  placeId: string,
  now = new Date(),
): { client: Competitor | null; competitors: Competitor[] } {
  const byId = `place_id:${placeId}`;
  const fromSearch = items.filter((i) => i.searchString !== byId);
  const seen = new Set<string>();
  const competitors: Competitor[] = [];
  let rankOfClient: number | null = null;
  for (const item of [...fromSearch].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))) {
    const c = parseCompetitor(item, now);
    if (!c || seen.has(c.placeId)) continue;
    seen.add(c.placeId);
    if (c.placeId === placeId) {
      rankOfClient = c.rank;
      continue;
    }
    const { closed, ...rest } = c;
    if (!closed) competitors.push(rest);
  }
  // A busca pelo termo também pode trazer o próprio negócio; prefere o item mais completo.
  const own = items.filter((i) => i.placeId === placeId).sort((a, b) => (b.reviews?.length ?? 0) - (a.reviews?.length ?? 0))[0];
  const parsed = own ? parseCompetitor(own, now) : null;
  let client: Competitor | null = null;
  if (parsed) {
    const { closed, ...rest } = parsed;
    // Fechado aparece no relatório mesmo assim: o dono precisa saber.
    client = { ...rest, rank: closed ? null : rankOfClient };
  }
  return { client, competitors };
}
