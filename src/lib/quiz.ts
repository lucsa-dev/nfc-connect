import type { StyleId } from "@/lib/card";
import type { PlaceInfo } from "@/lib/places";
import { formatBRL, PRICING } from "@/lib/pricing";

// Respostas --------------------------------------------------------------------

/** Onde o cliente termina o atendimento: a placa fica no balcão; o resto do ambiente recebe adesivos QR. */
export const SPOTS = [
  { id: "balcao", label: "No balcão ou caixa", hint: "A placa fica onde o cliente paga", kind: "plaque" },
  { id: "recepcao", label: "Na recepção", hint: "Adesivo QR na entrada ou na saída", kind: "sticker" },
  { id: "mesas", label: "Nas mesas", hint: "Adesivo QR em cada mesa", kind: "sticker" },
  { id: "atendente", label: "O atendente vai até o cliente", hint: "Adesivo QR com o atendente (salão, oficina, delivery)", kind: "sticker" },
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
  /** Balcões/caixas (não muda o kit: é sempre 1 placa por estabelecimento) */
  counters: number;
  /** Adesivos QR pelo ambiente (mesas, recepção, atendentes) */
  tables: number;
  style: StyleId;
  /** Modelo das placas e dos cartões do kit. */
  plaqueModel: PlaqueModel;
  cardModel: CardModel;
}

export type PlaqueModel = "placa-quadrada" | "placa-retangular";
export type CardModel = "cartao" | "cartao-vertical";

// Meta -------------------------------------------------------------------------

/** Degraus de meta; a última opção mostrada aparece como "X ou mais". */
export const GOAL_LADDER = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000] as const;

/** Até 5 metas acima do total atual (ex.: 50, 100, 250, 500, 1.000 ou mais). */
export function goalOptions(current: number | null | undefined): number[] {
  const c = Math.max(0, current ?? 0);
  const options = GOAL_LADDER.filter((g) => g > c).slice(0, 5);
  return options.length ? options : [Math.ceil((c + 1) / 1000) * 1000 * 2];
}

/** Rótulo da meta; a maior opção vira "ou mais". */
export function goalLabel(goal: number, options: number[]): string {
  const n = goal.toLocaleString("pt-BR");
  return goal === options[options.length - 1] ? `${n} ou mais` : `${n} avaliações`;
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

/** Limite de adesivos pedidos pelo quiz (mais que isso, combinamos no WhatsApp). */
export const MAX_STICKERS = 30;

/** Serviço de um estabelecimento: sempre 1 placa, mais os adesivos QR do ambiente. */
export interface Kit {
  plaques: 1;
  stickers: number;
  /** Adesivos além dos inclusos no serviço (cobrados à parte) */
  extraStickers: number;
  totalCents: number;
}

export function recommendKit(answers: Pick<QuizAnswers, "spots" | "tables">): Kit {
  const wantsStickers = answers.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "sticker");
  const stickers = wantsStickers ? Math.min(MAX_STICKERS, Math.max(1, answers.tables)) : 0;
  const extraStickers = Math.max(0, stickers - PRICING.includedStickers);
  return { plaques: 1, stickers, extraStickers, totalCents: PRICING.service + extraStickers * PRICING.extraSticker };
}

export function describeKit(kit: Kit): string {
  const stickers = kit.stickers ? ` + ${kit.stickers} ${kit.stickers === 1 ? "adesivo QR" : "adesivos QR"}` : "";
  return `1 placa${stickers}`;
}

export function kitPriceLabel(kit: Kit): string {
  return formatBRL(kit.totalCents);
}

/** Como o valor se compõe: "Serviço anual R$ 90,00 + 2 adesivos extras R$ 30,00". */
export function kitPriceBreakdown(kit: Kit): string {
  const base = `Serviço anual ${formatBRL(PRICING.service)}`;
  if (!kit.extraStickers) return base;
  const extra = `${kit.extraStickers} ${kit.extraStickers === 1 ? "adesivo extra" : "adesivos extras"}`;
  return `${base} + ${extra} ${formatBRL(kit.extraStickers * PRICING.extraSticker)}`;
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

/** Telefone do Google no formato do campo de WhatsApp, ou "" se não for um número válido. */
export function phoneForInput(phone: string | null | undefined): string {
  const e164 = phone ? normalizeBrPhone(phone) : null;
  return e164 ? formatBrPhone(e164) : "";
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
  /** Ex.: "placa 10 × 10 cm, cartão horizontal" */
  models?: string;
  goal: number | null;
}): string {
  const lines = [
    `Olá! Sou ${params.name.trim()} e quero o serviço TopTap.`,
    params.business ? `Negócio: ${params.business.name}${params.business.city ? ` (${params.business.city})` : ""}` : null,
    `Pedido: ${describeKit(params.kit)} · estilo ${params.styleLabel}`,
    params.models ? `Modelo: ${params.models}` : null,
    `Valor: ${kitPriceLabel(params.kit)}`,
    params.goal ? `Meta: ${params.goal} avaliações no Google` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
