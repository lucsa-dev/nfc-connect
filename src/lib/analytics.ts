export interface VisitRow {
  created_at: string;
  source: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  city: string | null;
  ip_hash: string | null;
  is_bot: boolean | null;
}

export interface Bucket {
  label: string;
  count: number;
}

export interface DailyBucket {
  date: string; // YYYY-MM-DD no fuso informado
  count: number;
}

export interface VisitSummary {
  total: number;
  uniqueVisitors: number;
  bots: number;
  bySource: Bucket[];
  byDevice: Bucket[];
  byOs: Bucket[];
  byBrowser: Bucket[];
  byCity: Bucket[];
  daily: DailyBucket[];
}

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const UNKNOWN = "Desconhecido";

/** Data local (YYYY-MM-DD) de um instante, no fuso informado. */
export function toLocalDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Lista de dias (YYYY-MM-DD) terminando em `end`, inclusive. */
export function lastNDays(n: number, end: Date, timeZone = DEFAULT_TIME_ZONE): string[] {
  const days: string[] = [];
  const endLocal = toLocalDate(end, timeZone);
  // Âncora ao meio-dia UTC evita problemas de horário de verão.
  const anchor = new Date(`${endLocal}T12:00:00Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(anchor.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function countBy<T>(items: T[], key: (item: T) => string | null | undefined): Bucket[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = key(item) || UNKNOWN;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Agrupa os itens além de `limit` em "Outros". */
export function topWithOthers(buckets: Bucket[], limit: number): Bucket[] {
  if (buckets.length <= limit) return buckets;
  const head = buckets.slice(0, limit);
  const rest = buckets.slice(limit).reduce((sum, b) => sum + b.count, 0);
  return [...head, { label: "Outros", count: rest }];
}

const SOURCE_LABELS: Record<string, string> = { nfc: "NFC / direto", qr: "QR Code" };
const DEVICE_LABELS: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
  unknown: UNKNOWN,
};

/** Consolida os acessos de um link (robôs ficam fora das métricas). */
export function summarizeVisits(
  rows: VisitRow[],
  options: { days?: number; now?: Date; timeZone?: string } = {},
): VisitSummary {
  const { days = 30, now = new Date(), timeZone = DEFAULT_TIME_ZONE } = options;
  const human = rows.filter((r) => !r.is_bot);

  const dayKeys = lastNDays(days, now, timeZone);
  const perDay = new Map(dayKeys.map((d) => [d, 0]));
  for (const row of human) {
    const day = toLocalDate(new Date(row.created_at), timeZone);
    if (perDay.has(day)) perDay.set(day, perDay.get(day)! + 1);
  }

  return {
    total: human.length,
    uniqueVisitors: new Set(human.map((r) => r.ip_hash).filter(Boolean)).size,
    bots: rows.length - human.length,
    bySource: countBy(human, (r) => (r.source ? SOURCE_LABELS[r.source] ?? r.source : null)),
    byDevice: countBy(human, (r) => (r.device_type ? DEVICE_LABELS[r.device_type] ?? r.device_type : null)),
    byOs: topWithOthers(countBy(human, (r) => r.os), 5),
    byBrowser: topWithOthers(countBy(human, (r) => r.browser), 5),
    byCity: topWithOthers(countBy(human, (r) => r.city), 5),
    daily: dayKeys.map((date) => ({ date, count: perDay.get(date)! })),
  };
}
