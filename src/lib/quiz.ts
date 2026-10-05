import type { StyleId } from "@/lib/card";
import type { PlaceInfo } from "@/lib/places";
import { formatBRL, PRICING } from "@/lib/pricing";

// Respostas --------------------------------------------------------------------

export const SPOTS = [
  { id: "balcao", label: "No balcão ou caixa", hint: "Placa fixa onde o cliente paga", kind: "plaque" },
  { id: "recepcao", label: "Na recepção", hint: "Placa na entrada ou na saída", kind: "plaque" },
  { id: "mesas", label: "Nas mesas", hint: "Cartão em cada mesa ou junto da conta", kind: "card" },
  { id: "atendente", label: "O atendente vai até o cliente", hint: "Cartão com o atendente (salão, oficina, delivery)", kind: "card" },
] as const;
export type SpotId = (typeof SPOTS)[number]["id"];

export const CLIENT_BANDS = [
  { id: "ate_10", label: "Até 10 clientes", perDay: 6 },
  { id: "11_50", label: "11 a 50 clientes", perDay: 30 },
  { id: "51_100", label: "51 a 100 clientes", perDay: 75 },
  { id: "101_300", label: "101 a 300 clientes", perDay: 200 },
  { id: "mais_300", label: "Mais de 300 clientes", perDay: 400 },
] as const;
export type ClientBandId = (typeof CLIENT_BANDS)[number]["id"];

export interface QuizAnswers {
  business: PlaceInfo | null;
  goal: number | null;
  spots: SpotId[];
  clients: ClientBandId | null;
  /** Balcões/caixas/recepções (placas) */
  counters: number;
  /** Mesas ou atendentes (cartões) */
  tables: number;
  style: StyleId;
}

// Meta -------------------------------------------------------------------------

function nice(n: number): number {
  const step = n < 200 ? 10 : n < 1000 ? 50 : 100;
  return Math.ceil(n / step) * step;
}

/** Opções de meta a partir do total atual (≈ 2×, 4× e 10×, arredondadas). */
export function goalOptions(current: number | null | undefined): number[] {
  const c = Math.max(0, current ?? 0);
  const raw = c < 25 ? [50, 100, 250] : [c * 2, c * 4, c * 10];
  const options = [...new Set(raw.map(nice))].filter((n) => n > c);
  return options.length ? options : [nice(c + 50)];
}

// Projeção ---------------------------------------------------------------------

/** Dias de atendimento por mês e fração conservadora de clientes que avaliam. */
export const PROJECTION = { workingDays: 26, reviewRate: 0.01 } as const;

export function monthlyNewReviews(clients: ClientBandId | null): number {
  const band = CLIENT_BANDS.find((b) => b.id === clients) ?? CLIENT_BANDS[1];
  return Math.max(1, Math.round(band.perDay * PROJECTION.workingDays * PROJECTION.reviewRate));
}

/** Prazo estimado em faixa ("2 a 3 meses"), nunca uma data exata. */
export function estimateTimeline(current: number, goal: number, clients: ClientBandId | null): string {
  const gap = goal - current;
  if (gap <= 0) return "meta já alcançada";
  const months = gap / monthlyNewReviews(clients);
  if (months < 1) return "menos de 1 mês";
  if (months > 24) return "mais de 2 anos";
  const low = Math.floor(months);
  const high = Math.ceil(months) === low ? low + 1 : Math.ceil(months);
  return `${low} a ${high} meses`;
}

// Diagnóstico ------------------------------------------------------------------

export type Tone = "bom" | "atencao" | "critico";
export interface DiagnosisItem {
  tone: Tone;
  text: string;
}

const DAY = 24 * 60 * 60 * 1000;

export function diagnose(place: PlaceInfo | null, now = new Date()): DiagnosisItem[] {
  if (!place || place.reviews === null) return [];
  const items: DiagnosisItem[] = [];
  const reviews = place.reviews ?? 0;

  if (reviews === 0) {
    items.push({ tone: "critico", text: "Ainda não há avaliações no Google. Quem procura o seu tipo de negócio tende a escolher quem já tem." });
  } else if (reviews < 50) {
    items.push({ tone: "atencao", text: `${reviews === 1 ? "Só 1 avaliação" : `Só ${reviews} avaliações`}. Mais avaliações passam confiança para quem ainda não te conhece.` });
  }
  if (place.rating !== null && reviews > 0 && place.rating < 4.7) {
    items.push({ tone: "atencao", text: `Nota ${place.rating.toFixed(1).replace(".", ",")}. Mais clientes satisfeitos avaliando ajudam a subir a média.` });
  }
  if (place.lastReviewAt) {
    const days = Math.floor((now.getTime() - Date.parse(place.lastReviewAt)) / DAY);
    if (days > 30) {
      const when = days >= 365 ? "há mais de um ano" : days >= 60 ? `há ${Math.floor(days / 30)} meses` : `há ${days} dias`;
      items.push({ tone: "atencao", text: `A avaliação mais recente foi ${when}. Avaliações recentes mostram que o negócio está ativo.` });
    }
  }
  if (items.length === 0) {
    items.push({ tone: "bom", text: "Boa reputação. A placa ajuda a manter o ritmo de avaliações novas." });
  }
  return items;
}

// Kit recomendado --------------------------------------------------------------

export interface Kit {
  plaques: number;
  cards: number;
  /** Total em centavos dos itens com preço definido */
  totalCents: number;
  /** Algum item é sob orçamento */
  hasQuote: boolean;
}

export function recommendKit(answers: Pick<QuizAnswers, "spots" | "counters" | "tables">): Kit {
  const wantsPlaque = answers.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "plaque");
  const wantsCards = answers.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "card");
  let plaques = wantsPlaque ? Math.max(1, answers.counters) : 0;
  const cards = wantsCards ? Math.max(1, answers.tables) : 0;
  if (plaques === 0 && cards === 0) plaques = 1;

  const cardTotal = PRICING.card === null ? 0 : cards * PRICING.card;
  return {
    plaques,
    cards,
    totalCents: plaques * PRICING.plaque + cardTotal,
    hasQuote: cards > 0 && PRICING.card === null,
  };
}

export function describeKit(kit: Kit): string {
  const parts = [];
  if (kit.plaques) parts.push(`${kit.plaques} ${kit.plaques === 1 ? "placa" : "placas"}`);
  if (kit.cards) parts.push(`${kit.cards} ${kit.cards === 1 ? "cartão" : "cartões"}`);
  return parts.join(" + ");
}

export function kitPriceLabel(kit: Kit): string {
  if (kit.totalCents === 0) return "sob orçamento";
  return kit.hasQuote ? `${formatBRL(kit.totalCents)} + cartões sob orçamento` : formatBRL(kit.totalCents);
}

// Contato ----------------------------------------------------------------------

/** "(11) 99999-8888" -> "+5511999998888". Aceita fixo ou celular com DDD. */
export function normalizeBrPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (!/^[1-9][1-9]/.test(digits)) return null; // DDD válido
  if (digits.length === 11 && digits[2] !== "9") return null; // celular começa com 9
  return `+55${digits}`;
}

export function formatBrPhone(e164: string): string {
  const d = e164.replace(/^\+55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

/** Mensagem que o cliente envia no WhatsApp ao concluir o quiz. */
export function whatsappSummary(params: {
  name: string;
  business: PlaceInfo | null;
  kit: Kit;
  styleLabel: string;
  goal: number | null;
}): string {
  const lines = [
    `Olá! Sou ${params.name.trim()} e quero a placa TopTap.`,
    params.business ? `Negócio: ${params.business.name}${params.business.city ? ` (${params.business.city})` : ""}` : null,
    `Pedido: ${describeKit(params.kit)} · estilo ${params.styleLabel}`,
    `Valor: ${kitPriceLabel(params.kit)}`,
    params.goal ? `Meta: ${params.goal} avaliações no Google` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
