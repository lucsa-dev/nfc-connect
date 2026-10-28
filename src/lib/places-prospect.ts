import { marketQuery } from "@/lib/apify-maps";
import { competitorFromProfile, type Competitor, type ProspectContact } from "@/lib/market";
import { parsePlaceProfile, PROFILE_FIELDS, type LatLng, type PlaceProfile } from "@/lib/places";
import { instagramHandle } from "@/lib/prospects";

/**
 * Prospecção pela Places API (New): bem mais barata que o scraper e termina em
 * segundos. Só o formato das requisições e a leitura das respostas, para poder
 * testar; as chamadas ficam em src/lib/market-server.ts.
 *
 * O que a Places API não informa: e-mail (lido do site ao prospectar), taxa de
 * resposta do dono e o ritmo de avaliações (vêm só 5 avaliações, as "mais
 * relevantes", não as mais recentes). Por isso o ritmo fica marcado como
 * desconhecido e não aparece na lista nem na proposta.
 */

/** Campos do perfil em cada lugar da Nearby Search (sem páginas). */
export const NEARBY_FIELD_MASK = PROFILE_FIELDS.split(",").map((f) => `places.${f}`).join(",");
/** Na Text Search, mais o token da próxima página. */
export const SEARCH_FIELD_MASK = `${NEARBY_FIELD_MASK},nextPageToken`;

/** A Text Search devolve até 20 lugares por página. */
export const PAGE_SIZE = 20;

/** Busca "termo em região", como o cliente digita no Maps. */
export function regionSearchBody(term: string, area: string, pageToken?: string) {
  return { textQuery: marketQuery(term, area), languageCode: "pt-BR", regionCode: "BR", pageSize: PAGE_SIZE, ...(pageToken && { pageToken }) };
}

const EARTH_M_PER_DEG = 111_320;

/** Retângulo que contém o círculo (a Text Search só restringe por retângulo). */
export function boundingBox(center: LatLng, radiusM: number) {
  const dLat = radiusM / EARTH_M_PER_DEG;
  const dLng = radiusM / (EARTH_M_PER_DEG * Math.cos((center.lat * Math.PI) / 180));
  return {
    low: { latitude: center.lat - dLat, longitude: center.lng - dLng },
    high: { latitude: center.lat + dLat, longitude: center.lng + dLng },
  };
}

/** Perto de mim, com o tipo de negócio digitado. */
export function nearbyTextBody(term: string, center: LatLng, radiusM: number, pageToken?: string) {
  return {
    textQuery: term,
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: PAGE_SIZE,
    locationRestriction: { rectangle: boundingBox(center, radiusM) },
    ...(pageToken && { pageToken }),
  };
}

/**
 * Perto de mim, sem tipo: os negócios que mais dependem de avaliação, em grupos
 * (a Nearby Search devolve até 20 por chamada, sem próxima página).
 */
export const NEARBY_TYPE_GROUPS = [
  ["restaurant", "meal_takeaway", "pizza_restaurant"],
  ["bakery", "cafe", "ice_cream_shop"],
  ["beauty_salon", "hair_care", "spa"],
  ["pet_store", "veterinary_care", "car_repair", "gym", "dentist", "physiotherapist"],
] as const;

export function nearbyTypesBody(types: readonly string[], center: LatLng, radiusM: number) {
  return {
    includedTypes: [...types],
    maxResultCount: PAGE_SIZE,
    rankPreference: "DISTANCE",
    languageCode: "pt-BR",
    regionCode: "BR",
    locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusM } },
  };
}

export function parseSearchPage(json: { places?: unknown[]; nextPageToken?: string }): { profiles: PlaceProfile[]; nextPageToken: string | null } {
  const profiles = (json.places ?? []).map((p) => parsePlaceProfile(p as Parameters<typeof parsePlaceProfile>[0])).filter((p): p is PlaceProfile => p !== null);
  return { profiles, nextPageToken: json.nextPageToken || null };
}

/** Contato que a Places API informa (o e-mail vem depois, do site). */
export function placesContact(profile: Pick<PlaceProfile, "phone" | "website">): ProspectContact {
  // Muitos negócios cadastram o Instagram como "site" no Google.
  const instagram = instagramHandle(profile.website?.includes("instagram.com") ? profile.website : null);
  return { phone: profile.phone, website: instagram ? null : profile.website, emails: [], instagram };
}

/** Lugar da busca como candidato da prospecção (posição = ordem da busca). */
export function prospectFromProfile(
  profile: PlaceProfile,
  rank: number | null,
  now = new Date(),
): Competitor & { closed: boolean; paceUnknown: true; contact: ProspectContact } {
  return {
    ...competitorFromProfile(profile, rank, now),
    closed: profile.businessStatus !== null && profile.businessStatus !== "OPERATIONAL",
    paceUnknown: true,
    contact: placesContact(profile),
  };
}
