/** Evolução de nota e avaliações no Google a partir das coletas (place_snapshots). */

export interface SnapshotPoint {
  business_id: string;
  created_at: string;
  rating: number | null;
  reviews: number | null;
}

export interface Growth {
  businessId: string;
  rating: number | null;
  reviews: number | null;
  lastAt: string;
  /** Novas avaliações em ~7 e ~30 dias e desde a 1ª coleta (null sem base de comparação). */
  reviews7d: number | null;
  reviews30d: number | null;
  reviewsTotal: number | null;
  ratingTotal: number | null;
  firstAt: string;
  /** Série para o minigráfico (avaliações por coleta, em ordem). */
  series: number[];
}

const DAY = 86_400_000;

/** Última coleta feita até `limit` (ou a mais antiga, se todas forem depois). */
function baseline(points: SnapshotPoint[], limit: number): SnapshotPoint | null {
  let found: SnapshotPoint | null = null;
  for (const p of points) {
    if (Date.parse(p.created_at) <= limit) found = p;
    else break;
  }
  return found;
}

const diff = (a: number | null, b: number | null | undefined) => (a === null || b === null || b === undefined ? null : a - b);

/** Agrupa por negócio e calcula a evolução. `points` pode vir em qualquer ordem. */
export function computeGrowth(points: SnapshotPoint[], now = new Date()): Map<string, Growth> {
  const byBusiness = new Map<string, SnapshotPoint[]>();
  for (const p of points) {
    const list = byBusiness.get(p.business_id) ?? [];
    list.push(p);
    byBusiness.set(p.business_id, list);
  }

  const result = new Map<string, Growth>();
  for (const [businessId, list] of byBusiness) {
    list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const first = list[0]!;
    const last = list[list.length - 1]!;
    const reviews = last.reviews === null ? null : Number(last.reviews);
    const rating = last.rating === null ? null : Number(last.rating);
    // Com uma coleta só não há comparação.
    const single = list.length === 1;
    const at7 = baseline(list, now.getTime() - 7 * DAY);
    const at30 = baseline(list, now.getTime() - 30 * DAY);

    result.set(businessId, {
      businessId,
      rating,
      reviews,
      lastAt: last.created_at,
      reviews7d: single || !at7 || at7 === last ? null : diff(reviews, at7.reviews),
      reviews30d: single || !at30 || at30 === last ? null : diff(reviews, at30.reviews),
      reviewsTotal: single ? null : diff(reviews, first.reviews),
      ratingTotal: single || rating === null || first.rating === null ? null : Math.round((rating - Number(first.rating)) * 10) / 10,
      firstAt: first.created_at,
      series: list.map((p) => Number(p.reviews ?? 0)),
    });
  }
  return result;
}
