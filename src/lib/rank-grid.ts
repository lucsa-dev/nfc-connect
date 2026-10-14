import type { LatLng } from "@/lib/places";

/**
 * Mapa de ranking: a mesma busca ("padaria") feita a partir de vários pontos ao
 * redor do negócio, como se o cliente estivesse em cada um. Só cálculos e o
 * formato das requisições; as chamadas ficam em src/lib/market-server.ts.
 *
 * A Text Search da Places API é pedida só com o campo places.id (SKU "IDs Only",
 * o mais barato). Os termos de uso permitem guardar Place IDs; o resultado
 * ainda assim expira em 30 dias (rank_grids.expires_at).
 */

export const GRID_SIZE = 5;
export const GRID_SPACING_M = 600;
/** A Text Search devolve até 20 lugares por página. */
export const GRID_DEPTH = 20;

export interface GridPoint {
  /** Coluna e linha (0 = oeste / norte). */
  x: number;
  y: number;
  lat: number;
  lng: number;
  /** Posição do negócio (1 = primeiro); null = fora dos 20 primeiros. */
  rank: number | null;
  /** Place IDs dos 3 primeiros nesse ponto. */
  top: string[];
}

const EARTH_M_PER_DEG = 111_320;

/** Pontos da grade, de noroeste a sudeste, com o negócio no centro. */
export function gridPoints(center: LatLng, size = GRID_SIZE, spacingM = GRID_SPACING_M): Array<Pick<GridPoint, "x" | "y" | "lat" | "lng">> {
  const half = (size - 1) / 2;
  const dLat = spacingM / EARTH_M_PER_DEG;
  const dLng = spacingM / (EARTH_M_PER_DEG * Math.cos((center.lat * Math.PI) / 180));
  const points = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      points.push({
        x,
        y,
        lat: Math.round((center.lat + (half - y) * dLat) * 1e6) / 1e6,
        lng: Math.round((center.lng + (x - half) * dLng) * 1e6) / 1e6,
      });
    }
  }
  return points;
}

export const GRID_FIELD_MASK = "places.id";

/** Corpo da Text Search (New) com o viés de localização num ponto da grade. */
export function textSearchBody(term: string, point: LatLng, radiusM = GRID_SPACING_M) {
  return {
    textQuery: term,
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: GRID_DEPTH,
    locationBias: { circle: { center: { latitude: point.lat, longitude: point.lng }, radius: radiusM } },
  };
}

export function parseTextSearchIds(json: { places?: Array<{ id?: string }> }): string[] {
  return (json.places ?? []).map((p) => p.id).filter((id): id is string => Boolean(id));
}

export function rankIn(ids: string[], placeId: string): number | null {
  const i = ids.indexOf(placeId);
  return i === -1 ? null : i + 1;
}

export interface GridSummary {
  /** Pontos em que aparece no top 3 e nos 20 primeiros. */
  top3: number;
  found: number;
  total: number;
  /** Média das posições (fora dos 20 conta como 21). */
  average: number | null;
  /** Quem mais aparece em 1º lugar na grade. */
  leader: { placeId: string; points: number } | null;
}

export function summarizeGrid(points: GridPoint[]): GridSummary {
  const total = points.length;
  if (total === 0) return { top3: 0, found: 0, total, average: null, leader: null };
  const found = points.filter((p) => p.rank !== null);
  const average = points.reduce((sum, p) => sum + (p.rank ?? GRID_DEPTH + 1), 0) / total;
  const firsts = new Map<string, number>();
  for (const p of points) if (p.top[0]) firsts.set(p.top[0], (firsts.get(p.top[0]) ?? 0) + 1);
  const best = [...firsts].sort((a, b) => b[1] - a[1])[0];
  return {
    top3: points.filter((p) => p.rank !== null && p.rank <= 3).length,
    found: found.length,
    total,
    average: Math.round(average * 10) / 10,
    leader: best ? { placeId: best[0], points: best[1] } : null,
  };
}

export function readGridPoints(value: unknown): GridPoint[] {
  return Array.isArray(value)
    ? (value as GridPoint[]).filter((p) => p && typeof p.x === "number" && typeof p.y === "number" && Array.isArray(p.top))
    : [];
}
