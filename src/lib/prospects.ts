import { formatBRL } from "@/lib/pricing";
import { normalizeBrPhone } from "@/lib/quiz";
import { formatDistance, type Prospect } from "@/lib/market";

/**
 * Clientes em prospecção: contato um a um pelo WhatsApp com a proposta em PDF.
 * Só regras e textos (sem servidor), para poder testar.
 */

export const PROSPECT_STATUSES = [
  { id: "novo", label: "Novo" },
  { id: "enviado", label: "Proposta enviada" },
  { id: "conversando", label: "Conversando" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]["id"];

export const statusLabel = (id: string) => PROSPECT_STATUSES.find((s) => s.id === id)?.label ?? id;

/** Dias de validade da proposta. */
export const PROPOSAL_VALID_DAYS = 7;

/** "https://instagram.com/padaria.x/?hl=pt" ou "@padaria.x" -> "padaria.x". */
export function instagramHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  const fromUrl = text.match(/instagram\.com\/([^/?#\s]+)/i)?.[1];
  const handle = (fromUrl ?? text).replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null;
  // Links que não são de perfil.
  if (["p", "reel", "reels", "explore", "stories", "accounts"].includes(handle)) return null;
  return handle;
}

export interface BrazilPhone {
  /** Só dígitos, com DDI: 5585999998888. */
  e164: string;
  /** Celular quase sempre tem WhatsApp; fixo só se for WhatsApp Business. */
  mobile: boolean;
}

/** Telefone do Google ou digitado ("(85) 99999-8888", "+55 85 3333-4444"), ou null. */
export function parseBrazilPhone(value: string | null | undefined): BrazilPhone | null {
  const e164 = value ? normalizeBrPhone(value) : null;
  if (!e164) return null;
  const digits = e164.replace(/\D/g, "");
  return { e164: digits, mobile: digits.length === 13 };
}

/** Link do WhatsApp do cliente com a mensagem pronta (null sem telefone válido). */
export function prospectWhatsappHref(phone: string | null | undefined, message: string): string | null {
  const parsed = parseBrazilPhone(phone);
  return parsed ? `https://wa.me/${parsed.e164}?text=${encodeURIComponent(message)}` : null;
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
/** Imagens e domínios de exemplo que o padrão de e-mail pega por engano. */
const NOT_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|@(example|exemplo|sentry|wixpress|domain)\./i;

/** E-mails e Instagram de uma página do site do negócio (o Google não informa e-mail). */
export function contactsFromHtml(html: string): { emails: string[]; instagram: string | null } {
  const text = html.replace(/&#64;|&commat;/gi, "@");
  const emails = [...new Set((text.match(EMAIL) ?? []).map((e) => e.toLowerCase()).filter((e) => !NOT_EMAIL.test(e)))].slice(0, 3);
  const instagram = [...text.matchAll(/instagram\.com\/[^"'\s<>]+/gi)].map((m) => instagramHandle(m[0])).find(Boolean) ?? null;
  return { emails, instagram };
}

/** Os dados do negócio salvos com o cliente (o Prospect da busca). */
export function readProspectData(value: unknown): Partial<Prospect> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<Prospect>) : {};
}

const decimal = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Frase curta sobre o perfil no Google, usada na mensagem e na proposta. */
export function profileSummary(p: Partial<Prospect>): string | null {
  if (p.reviews === undefined) return null;
  if (!p.reviews) return "ainda não tem avaliações no Google";
  const rating = p.rating != null ? `nota ${decimal(p.rating)} ` : "";
  return `tem ${rating}com ${p.reviews.toLocaleString("pt-BR")} avaliações no Google`;
}

/** Mensagem que acompanha o PDF no WhatsApp (o vendedor pode editar antes de enviar). */
export function proposalMessage(input: { name: string; contactName: string | null; data: Partial<Prospect> }): string {
  const greeting = input.contactName?.trim() ? `Olá, ${input.contactName.trim().split(/\s+/)[0]}! Tudo bem?` : "Olá! Tudo bem?";
  const summary = profileSummary(input.data);
  return [
    greeting,
    "",
    `Sou da TopTap. Dei uma olhada no perfil da ${input.name} no Google Maps${summary ? `: ${summary}` : ""}.`,
    "Quem tem mais avaliações aparece antes na busca, e a gente ajuda com isso: uma placa no balcão para o cliente avaliar em um toque e um relatório todo mês com a sua posição e a dos concorrentes.",
    "",
    "Preparei uma proposta para vocês, segue em PDF. Posso te explicar em 2 minutos?",
  ].join("\n");
}

/** Nome do arquivo da proposta: "proposta-toptap-padaria-central.pdf". */
export function proposalFileName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `proposta-toptap${slug ? `-${slug}` : ""}.pdf`;
}

/** "R$ 90,00" a partir do texto digitado ("90", "90,00", "R$ 1.200,50"); null se vazio. */
export function parsePriceCents(value: string): number | null | "invalid" {
  const text = value.replace(/R\$|\s/g, "");
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 100_000) return "invalid";
  return Math.round(n * 100);
}

export const formatPrice = (cents: number | null) => (cents === null ? "" : formatBRL(cents));

/** Colunas da planilha da busca, na ordem do arquivo. */
export const SHEET_COLUMNS = [
  "Oportunidade",
  "Negócio",
  "Categoria",
  "Endereço",
  "Posição / distância",
  "Nota",
  "Avaliações",
  "Telefone",
  "Tipo de telefone",
  "E-mail",
  "Instagram",
  "Site",
  "Motivos",
  "Status",
  "Proposta (PDF)",
  "WhatsApp",
  "Google Maps",
] as const;

export type SheetRow = Record<(typeof SHEET_COLUMNS)[number], string | number | null>;

/**
 * Uma linha por negócio da busca, com os links da proposta em PDF e do WhatsApp
 * com a mensagem pronta. `origin` monta links absolutos (abrem com login no painel).
 */
export function prospectSheetRows(
  prospects: Prospect[],
  opts: { origin: string; searchId: string; nearby: boolean; listed: Map<string, { status: string }> },
): SheetRow[] {
  return prospects.map((p) => {
    const phone = p.contact?.phone ?? null;
    const parsed = parseBrazilPhone(phone);
    const position = opts.nearby ? (p.distanceM != null ? formatDistance(p.distanceM) : null) : p.rank ? `${p.rank}º` : null;
    const listed = opts.listed.get(p.placeId);
    return {
      Oportunidade: p.score,
      Negócio: p.name,
      Categoria: p.category ?? null,
      Endereço: p.address ?? null,
      "Posição / distância": position,
      Nota: p.rating != null ? decimal(p.rating) : null,
      Avaliações: p.reviews,
      Telefone: phone,
      "Tipo de telefone": phone ? (parsed ? (parsed.mobile ? "celular" : "fixo") : "inválido") : null,
      "E-mail": p.contact?.emails.join(", ") || null,
      Instagram: p.contact?.instagram ? `https://instagram.com/${p.contact.instagram}` : null,
      Site: p.contact?.website ?? null,
      Motivos: p.reasons.join("; ") || null,
      Status: listed ? statusLabel(listed.status) : null,
      "Proposta (PDF)": `${opts.origin}/dashboard/prospeccao/${opts.searchId}/proposta/${encodeURIComponent(p.placeId)}`,
      WhatsApp: prospectWhatsappHref(phone, proposalMessage({ name: p.name, contactName: null, data: p })),
      "Google Maps": p.mapsUrl ?? null,
    };
  });
}
