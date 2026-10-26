import type { LatLng, PlaceProfile } from "@/lib/places";

/**
 * Relatório de concorrência e prospecção: cruzamento dos dados do Google Maps
 * do negócio com os concorrentes da mesma busca. Só cálculos (sem servidor),
 * para poder testar; a coleta fica em src/lib/market-server.ts.
 */

const DAY = 86_400_000;
const MONTH_DAYS = 30;

export interface RecentReview {
  stars: number | null;
  date: string | null;
  replied: boolean;
  /** Texto curto, sem o nome do autor. */
  text: string | null;
}

/** Um negócio na busca do Google (o cliente ou um concorrente). */
export interface Competitor {
  placeId: string;
  name: string;
  /** Posição na busca "termo em região" (null = fora dos resultados coletados). */
  rank: number | null;
  rating: number | null;
  reviews: number;
  category: string | null;
  address: string | null;
  /** Bairro e cidade ("Aldeota, Fortaleza"), para a busca do relatório. */
  area?: string | null;
  mapsUrl: string | null;
  location: LatLng | null;
  website: boolean;
  phone: boolean;
  description: boolean;
  hours: string[];
  photos: number;
  lastReviewAt: string | null;
  distribution: [number, number, number, number, number] | null;
  replies: { replied: number; total: number } | null;
  /** Avaliações mais recentes coletadas (até 20). */
  recent: RecentReview[];
  /** Avaliações novas por mês (estimado pelas datas das recentes). */
  pace: number;
}

/** O que fica salvo em market_reports.data. */
export interface MarketData {
  version: 1;
  generatedAt: string;
  term: string;
  area: string;
  client: Competitor;
  /** Concorrentes da busca, sem o cliente, na ordem do Google. */
  competitors: Competitor[];
  /** Ritmo do cliente pelas coletas semanais (mais preciso que a estimativa). */
  clientPaceFromSnapshots: number | null;
  /** Ritmo médio dos clientes com a placa (avaliações/mês), quando há base. */
  benchmarkPace: number | null;
  /** Resultado da placa nos últimos 30 dias (só para quem já é cliente). */
  plate: { taps30d: number; reviews30d: number | null } | null;
  /** Posição do cliente no relatório anterior com a mesma busca. */
  previousRank: number | null;
  previousAt: string | null;
}

// Ritmo ------------------------------------------------------------------------------

/**
 * Avaliações novas por mês a partir das datas das mais recentes.
 * Se a amostra cobre todas as avaliações do negócio, divide pelo período desde a
 * primeira; senão, pelo período coberto pela amostra (mínimo de 7 dias).
 */
export function estimatePace(dates: Array<string | null>, total: number, now = new Date()): number {
  const times = dates
    .map((d) => (d ? Date.parse(d) : NaN))
    .filter((t) => Number.isFinite(t) && t <= now.getTime())
    .sort((a, b) => b - a);
  if (times.length === 0) return 0;
  const oldest = times[times.length - 1]!;
  const spanDays = (now.getTime() - oldest) / DAY;
  const complete = total <= times.length;
  const minDays = complete ? MONTH_DAYS : 7;
  const pace = (times.length / Math.max(spanDays, minDays)) * MONTH_DAYS;
  return Math.round(pace * 10) / 10;
}

/** Converte um perfil do Google em Competitor (usa as avaliações em destaque). */
export function competitorFromProfile(profile: PlaceProfile, rank: number | null = null, now = new Date()): Competitor {
  const recent = profile.sampleReviews.map((r) => ({
    stars: r.rating,
    date: r.publishTime,
    replied: Boolean(r.ownerReplied),
    text: r.text?.slice(0, 400) ?? null,
  }));
  return {
    placeId: profile.placeId,
    name: profile.name,
    rank,
    rating: profile.rating,
    reviews: profile.reviews ?? 0,
    category: profile.category,
    address: profile.address,
    mapsUrl: profile.mapsUrl,
    location: profile.location,
    website: Boolean(profile.website),
    phone: Boolean(profile.phone),
    description: Boolean(profile.summary),
    hours: profile.hours,
    photos: profile.photos,
    lastReviewAt: profile.lastReviewAt,
    distribution: profile.distribution,
    replies: profile.ownerReplies,
    recent,
    pace: estimatePace(recent.map((r) => r.date), profile.reviews ?? 0, now),
  };
}

/** Ritmo usado nas contas: o das coletas, quando há, ou a estimativa. */
export function clientPace(data: Pick<MarketData, "client" | "clientPaceFromSnapshots">): number {
  return data.clientPaceFromSnapshots ?? data.client.pace;
}

// Contas -----------------------------------------------------------------------------

/** Média exata pela distribuição de estrelas (a nota do Google vem arredondada). */
export function exactAverage(c: Pick<Competitor, "rating" | "distribution">): number | null {
  const d = c.distribution;
  const count = d ? d.reduce((a, b) => a + b, 0) : 0;
  if (d && count > 0) return d.reduce((sum, n, i) => sum + n * (i + 1), 0) / count;
  return c.rating;
}

/**
 * Quantas avaliações 5 estrelas (sem nenhuma negativa) para a nota exibida
 * chegar a `target`. O Google mostra uma casa decimal: 4,45 já aparece como 4,5.
 * null: impossível (meta 5,0 com alguma nota abaixo) ou sem dados.
 */
export function fiveStarsToReach(c: Pick<Competitor, "rating" | "distribution" | "reviews">, target: number): number | null {
  const avg = exactAverage(c);
  const count = c.distribution ? c.distribution.reduce((a, b) => a + b, 0) || c.reviews : c.reviews;
  if (avg === null || count <= 0) return null;
  const threshold = Math.round((target - 0.05) * 1000) / 1000;
  if (avg >= threshold) return 0;
  if (threshold >= 5) return null;
  return Math.ceil((count * (threshold - avg)) / (5 - threshold) - 1e-9);
}

/** Próximas metas de nota: o próximo décimo e os marcos 4,5 e 4,8 acima da nota atual. */
export function ratingTargets(rating: number | null): number[] {
  if (rating === null || rating >= 4.9) return [];
  const next = Math.round((Math.floor(rating * 10 + 1e-9) + 1)) / 10;
  return [...new Set([next, ...[4.5, 4.8].filter((m) => m > next)])].slice(0, 3);
}

/** Avaliações que faltam para passar `target` em quantidade (0 se já passou). */
export function reviewsToPass(client: Pick<Competitor, "reviews">, target: Pick<Competitor, "reviews">): number {
  return Math.max(0, target.reviews - client.reviews + 1);
}

/** Meses para alcançar quem está à frente, mantidos os ritmos. null: não alcança. */
export function monthsToCatchUp(gap: number, pace: number, rivalPace: number): number | null {
  if (gap <= 0) return 0;
  const diff = pace - rivalPace;
  if (diff <= 0) return null;
  return gap / diff;
}

/** "menos de 1 mês", "3 meses", "mais de 3 anos", "não alcança". */
export function formatMonths(months: number | null): string {
  if (months === null) return "não alcança no ritmo atual";
  if (months === 0) return "já passou";
  if (months < 1) return "menos de 1 mês";
  if (months > 36) return "mais de 3 anos";
  const m = Math.ceil(months);
  return m === 1 ? "1 mês" : `${m} meses`;
}

export interface CatchUp {
  rival: Competitor;
  label: string;
  gap: number;
  /** Meses no ritmo atual do cliente. */
  now: number | null;
  /** Meses no ritmo médio dos clientes com a placa. */
  withPlate: number | null;
}

/** Quem vale a pena mirar: o próximo à frente em avaliações e o 1º da busca. */
export function catchUpTargets(data: MarketData): CatchUp[] {
  const pace = clientPace(data);
  const ahead = data.competitors.filter((c) => c.reviews >= data.client.reviews).sort((a, b) => a.reviews - b.reviews);
  const targets: Array<{ rival: Competitor; label: string }> = [];
  if (ahead[0]) targets.push({ rival: ahead[0], label: "Próximo à frente em avaliações" });
  const leader = data.competitors.find((c) => c.rank === 1) ?? data.competitors[0];
  if (leader && leader.reviews >= data.client.reviews && leader.placeId !== ahead[0]?.placeId) {
    targets.push({ rival: leader, label: "1º lugar na busca" });
  }
  return targets.map(({ rival, label }) => {
    const gap = reviewsToPass(data.client, rival);
    return {
      rival,
      label,
      gap,
      now: monthsToCatchUp(gap, pace, rival.pace),
      withPlate: data.benchmarkPace !== null ? monthsToCatchUp(gap, Math.max(pace, data.benchmarkPace), rival.pace) : null,
    };
  });
}

// Comparação ---------------------------------------------------------------------------

/** Mediana (null para lista vazia). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export const replyRate = (c: Pick<Competitor, "replies">) =>
  c.replies && c.replies.total > 0 ? c.replies.replied / c.replies.total : null;

export const daysSince = (iso: string | null, now = new Date()) =>
  iso && Number.isFinite(Date.parse(iso)) ? Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / DAY)) : null;

/** Fatia das avaliações novas da região (estimada pelo ritmo de cada um). */
export function shareOfVoice(data: MarketData): Array<{ placeId: string; name: string; share: number; isClient: boolean }> {
  const all = [{ ...data.client, pace: clientPace(data), isClient: true }, ...data.competitors.map((c) => ({ ...c, isClient: false }))];
  const total = all.reduce((sum, c) => sum + c.pace, 0);
  if (total <= 0) return [];
  return all
    .map((c) => ({ placeId: c.placeId, name: c.name, share: c.pace / total, isClient: c.isClient }))
    .sort((a, b) => b.share - a.share);
}

// Horário --------------------------------------------------------------------------------

export const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
const DAY_KEYS: Array<[RegExp, number]> = [
  [/^(dom|sun)/, 0],
  [/^(seg|mon)/, 1],
  [/^(ter|tue)/, 2],
  [/^(qua|wed)/, 3],
  [/^(qui|thu)/, 4],
  [/^(sex|fri)/, 5],
  [/^(sab|sat)/, 6],
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Dias abertos (0 = domingo) a partir do horário do Google; null se não informado. */
export function openDays(hours: string[]): Set<number> | null {
  if (hours.length === 0) return null;
  const open = new Set<number>();
  let read = 0;
  for (const line of hours) {
    const [dayPart, ...rest] = line.split(":");
    const day = DAY_KEYS.find(([re]) => re.test(fold(dayPart ?? "")))?.[1];
    if (day === undefined) continue;
    read++;
    if (!/fechado|closed/.test(fold(rest.join(":")))) open.add(day);
  }
  return read ? open : null;
}

export interface HoursInsight {
  kind: "diferencial" | "perdendo" | "sem_horario";
  day: number | null;
  /** Concorrentes com horário informado e quantos abrem nesse dia. */
  open: number;
  of: number;
}

/**
 * Dias em que o cliente abre e quase ninguém abre (diferencial a divulgar) e dias
 * em que a maioria abre e ele não (clientes indo para o concorrente).
 */
export function hoursInsights(client: Pick<Competitor, "hours">, competitors: Array<Pick<Competitor, "hours">>): HoursInsight[] {
  const theirs = competitors.map((c) => openDays(c.hours)).filter((d): d is Set<number> => d !== null);
  const mine = openDays(client.hours);
  if (!mine) return theirs.length >= 2 ? [{ kind: "sem_horario", day: null, open: theirs.length, of: competitors.length }] : [];
  if (theirs.length < 3) return [];
  const result: HoursInsight[] = [];
  for (let day = 0; day < 7; day++) {
    const open = theirs.filter((d) => d.has(day)).length;
    const share = open / theirs.length;
    if (mine.has(day) && share <= 1 / 3) result.push({ kind: "diferencial", day, open, of: theirs.length });
    if (!mine.has(day) && share >= 2 / 3) result.push({ kind: "perdendo", day, open, of: theirs.length });
  }
  return result;
}

// Perfil -----------------------------------------------------------------------------------

export interface ProfileGap {
  id: string;
  label: string;
  detail: string;
}

/** O que os concorrentes têm e o cliente não (só o que a maioria tem). */
export function profileGaps(client: Competitor, competitors: Competitor[]): ProfileGap[] {
  const n = competitors.length;
  if (n === 0) return [];
  const gaps: ProfileGap[] = [];
  const pct = (k: number) => `${Math.round((k / n) * 100)}%`;
  const withSite = competitors.filter((c) => c.website).length;
  if (!client.website && withSite / n >= 0.5) gaps.push({ id: "site", label: "Site no perfil", detail: `${pct(withSite)} dos concorrentes têm.` });
  const withDesc = competitors.filter((c) => c.description).length;
  if (!client.description && withDesc / n >= 0.5) gaps.push({ id: "descricao", label: "Descrição do negócio", detail: `${pct(withDesc)} dos concorrentes têm.` });
  const withPhone = competitors.filter((c) => c.phone).length;
  if (!client.phone && withPhone / n >= 0.5) gaps.push({ id: "telefone", label: "Telefone", detail: `${pct(withPhone)} dos concorrentes têm.` });
  const photos = median(competitors.map((c) => c.photos));
  if (photos !== null && client.photos < photos * 0.6) {
    gaps.push({ id: "fotos", label: "Fotos", detail: `Você tem ${client.photos}; a mediana dos concorrentes é ${Math.round(photos)}.` });
  }
  const rates = competitors.map(replyRate).filter((r): r is number => r !== null);
  const mine = replyRate(client);
  const theirs = median(rates);
  if (mine !== null && theirs !== null && mine + 0.2 < theirs) {
    gaps.push({
      id: "respostas",
      label: "Respostas às avaliações",
      detail: `Você respondeu ${Math.round(mine * 100)}% das recentes; os concorrentes, ${Math.round(theirs * 100)}% (mediana).`,
    });
  }
  return gaps;
}

/** Avaliações de até 3 estrelas sem resposta do dono, mais recentes primeiro. */
export function unansweredNegatives(c: Pick<Competitor, "recent">): RecentReview[] {
  return c.recent
    .filter((r) => r.stars !== null && r.stars <= 3 && !r.replied && r.text)
    .sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
}

// Prospecção -------------------------------------------------------------------------------

export interface Prospect extends Competitor {
  closed: boolean;
  score: number;
  reasons: string[];
  /** Distância até o vendedor, na busca "perto de mim". */
  distanceM?: number | null;
}

/** Distância em metros entre dois pontos (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

/** "350 m", "1,2 km". */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

/**
 * Nota de 0 a 100 de quanto a placa ajuda o negócio (e de quão fácil é vender):
 * nota boa com poucas avaliações para a região, ritmo baixo, dono que não
 * responde e perfil incompleto somam pontos.
 */
export function opportunityScore(
  p: Pick<Competitor, "rating" | "reviews" | "pace" | "replies" | "website" | "hours" | "photos"> &
    Partial<Pick<Competitor, "description">> & { closed?: boolean },
  areaMedianReviews: number | null,
): { score: number; reasons: string[] } {
  if (p.closed) return { score: 0, reasons: ["Fechado"] };
  const reasons: string[] = [];
  let score = 0;

  const rating = p.rating ?? 0;
  if (p.reviews === 0) {
    score += 20;
    reasons.push("Sem avaliações");
  } else if (rating >= 4.3) {
    score += 30;
    reasons.push("Nota boa: produto aprovado, falta prova social");
  } else if (rating >= 4) {
    score += 18;
  } else {
    score += 8;
    reasons.push("Nota baixa: precisa de avaliações boas para diluir");
  }

  if (areaMedianReviews && areaMedianReviews > 0) {
    const ratio = p.reviews / areaMedianReviews;
    if (ratio < 1) {
      score += Math.round(30 * (1 - ratio));
      if (ratio < 0.5) reasons.push("Bem menos avaliações que a média da região");
    }
  }

  if (p.pace < 2) {
    score += 15;
    reasons.push("Quase não recebe avaliações novas");
  } else if (p.pace < 5) score += 8;

  const rate = replyRate(p);
  if (rate !== null && rate < 0.3) {
    score += 10;
    reasons.push("Não responde as avaliações");
  }

  // Apresentação do perfil (SEO do Perfil da Empresa no Google).
  const missing = [
    !p.website && "site",
    p.hours.length === 0 && "horário",
    p.photos < 10 && "fotos",
    p.description === false && "descrição",
  ].filter((m): m is string => Boolean(m));
  score += Math.min(missing.length, 3) * 5;
  if (missing.length >= 2) reasons.push(`Perfil sem ${missing.join(", ")}`);

  // Quem já tem muitas avaliações precisa menos da placa.
  if (p.reviews >= 1000) score = Math.round(score * 0.5);
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/** Pontua e ordena os negócios encontrados na prospecção. */
export function rankProspects(items: Array<Competitor & { closed: boolean; distanceM?: number | null }>): Prospect[] {
  const med = median(items.filter((i) => !i.closed).map((i) => i.reviews));
  return items
    .map((i) => ({ ...i, ...opportunityScore(i, med) }))
    .sort((a, b) => b.score - a.score || a.reviews - b.reviews);
}

/** Lê o jsonb salvo (versão atual) ou null. */
export function readMarketData(value: unknown): MarketData | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<MarketData>;
  if (d.version !== 1 || !d.client || !Array.isArray(d.competitors)) return null;
  return d as MarketData;
}

export function readProspects(value: unknown): Prospect[] {
  return Array.isArray(value) ? (value as Prospect[]).filter((p) => p && typeof p.placeId === "string") : [];
}

// Relatório mensal ------------------------------------------------------------------

/** Intervalo entre os relatórios mensais de um cliente com plano. */
export const MONTHLY_REPORT_DAYS = 30;

interface ReportSummary {
  term: string;
  area: string;
  status: string;
  created_at: string;
}

/**
 * Busca (termo e região) do próximo relatório mensal, ou null se ainda não é
 * hora. Vence 30 dias depois do último que não falhou e repete a busca do
 * último pronto, para comparar mês a mês. Sem nenhum pronto: "sem_base".
 */
export function monthlyReportSearch(reports: ReportSummary[], now: Date): { term: string; area: string } | "sem_base" | null {
  const sorted = reports.filter((r) => r.status !== "failed").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const last = sorted[0];
  if (last && now.getTime() - new Date(last.created_at).getTime() < MONTHLY_REPORT_DAYS * 86_400_000) return null;
  const base = sorted.find((r) => r.status === "ready");
  return base ? { term: base.term, area: base.area } : "sem_base";
}
