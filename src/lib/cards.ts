import { resolveRedirect, type RedirectDecision, type ResolvedLink } from "@/lib/redirect";
import { SOURCE_PARAM, type VisitSource } from "@/lib/urls";
import type { VisitInfo } from "@/lib/visit";

/**
 * Peças em branco (cartões e placas de um lote). Cada uma tem um código curto
 * gravado no chip NFC e no QR Code: /c/{codigo}. Em branco, leva à ativação;
 * ativada, funciona como o link de avaliação dela.
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

export interface ResolvedCard {
  code: string;
  link: (ResolvedLink & { is_active: boolean; slug: string; business_slug: string }) | null;
}

export interface CardRepository {
  findCard(code: string): Promise<ResolvedCard | null>;
  recordVisit(link: ResolvedLink, visit: VisitInfo): Promise<void>;
}

export type CardDecision = RedirectDecision | { kind: "activate"; location: string };

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

  if (!card.link) {
    const url = new URL(`/c/${code}/ativar`, params.request.url);
    return { kind: "activate", location: url.toString() };
  }

  const link = card.link;
  return resolveRedirect({
    businessSlug: link.business_slug,
    linkSlug: link.slug,
    request: params.request,
    ipSalt: params.ipSalt,
    repo: {
      findActiveLink: async () => (link.is_active ? link : null),
      recordVisit: params.repo.recordVisit,
    },
  });
}
