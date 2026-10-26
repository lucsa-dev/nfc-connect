import { resolveRedirect, type RedirectDecision, type ResolvedLink, type VisitRecord } from "@/lib/redirect";
import { CARD_PARAM, SOURCE_PARAM, type VisitSource } from "@/lib/urls";

/**
 * Peças em branco (cartões e placas de um lote). Cada uma tem um código curto
 * gravado no chip NFC e no QR Code: /c/{codigo}. Em branco, leva à ativação;
 * ativada, leva a um link do negócio ou à página dele (ver pickCardLink).
 */

/** Sem 0/1/i/l/o, para não confundir ao ler impresso. Igual ao check do banco. */
export const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const CODE_LENGTH = 8;
export const CODE_PATTERN = /^[2-9a-hjkmnp-z]{8}$/;
export const BATCH_MAX = 200;

/** Código aleatório (31^8 ≈ 850 bilhões de combinações: não dá para adivinhar). */
export function generateCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  let code = "";
  // Rejeita bytes acima do maior múltiplo de 31 para não enviesar a distribuição.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  while (code.length < CODE_LENGTH) {
    for (const byte of random(CODE_LENGTH * 2)) {
      if (byte >= limit) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

export function normalizeCode(input: string): string | null {
  const code = input.trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** URL da peça: no chip NFC (sem parâmetro) ou no QR Code (?s=qr). */
export function buildCardUrl(baseUrl: string, code: string, source?: VisitSource): string {
  const url = `${baseUrl.replace(/\/+$/, "")}/c/${code}`;
  return source === "qr" ? `${url}?${SOURCE_PARAM}=qr` : url;
}

export interface CardLink extends Omit<ResolvedLink, "meta_pixel_id"> {
  slug: string;
  is_active: boolean;
}

export interface ResolvedCard {
  id: string;
  code: string;
  direct_link_id: string | null;
  /** Vazio = peça em branco. */
  business: { slug: string; meta_pixel_id: string | null; links: CardLink[] } | null;
}

export interface CardRepository {
  findCard(code: string): Promise<ResolvedCard | null>;
  recordVisit(link: ResolvedLink, visit: VisitRecord): Promise<void>;
}

export type CardDecision = RedirectDecision | { kind: "activate" | "page"; location: string };

/**
 * Para onde a peça vai: o link fixado (se ainda ativo) ou, no automático, o
 * único link ativo do negócio. Null = abrir a página do negócio.
 */
export function pickCardLink(directLinkId: string | null, links: CardLink[]): CardLink | null {
  const active = links.filter((l) => l.is_active);
  return active.find((l) => l.id === directLinkId) ?? (active.length === 1 ? active[0] : null);
}

export async function resolveCard(params: {
  code: string;
  request: Request;
  repo: CardRepository;
  ipSalt: string;
}): Promise<CardDecision> {
  const code = normalizeCode(params.code);
  if (!code) return { kind: "not_found" };

  const card = await params.repo.findCard(code);
  if (!card) return { kind: "not_found" };

  if (!card.business) {
    const url = new URL(`/c/${code}/ativar`, params.request.url);
    return { kind: "activate", location: url.toString() };
  }

  const { business } = card;
  const link = pickCardLink(card.direct_link_id, business.links);
  if (!link) {
    // A página registra o acesso (com a peça) e dispara o Pixel.
    const url = new URL(`/${business.slug}`, params.request.url);
    const source = new URL(params.request.url).searchParams.get(SOURCE_PARAM);
    url.searchParams.set(CARD_PARAM, code);
    if (source) url.searchParams.set(SOURCE_PARAM, source);
    return { kind: "page", location: url.toString() };
  }

  return resolveRedirect({
    businessSlug: business.slug,
    linkSlug: link.slug,
    request: params.request,
    ipSalt: params.ipSalt,
    cardId: card.id,
    repo: {
      findActiveLink: async () => ({ ...link, meta_pixel_id: business.meta_pixel_id }),
      recordVisit: params.repo.recordVisit,
    },
  });
}
