import { buildPixelRedirectPage, isValidPixelId } from "@/lib/pixel";
import { isValidSlug } from "@/lib/slug";
import { VIA_PAGE, VIA_PARAM } from "@/lib/urls";
import { extractVisitInfo, type VisitInfo } from "@/lib/visit";

export interface ResolvedLink {
  id: string;
  business_id: string;
  url: string | null;
  type: string;
  pix_key: string | null;
  /** Pixel do Meta do negócio, se configurado. */
  meta_pixel_id: string | null;
}

/** Acesso a gravar: com a peça, quando veio de uma. */
export type VisitRecord = VisitInfo & { card_id?: string };

export interface LinkRepository {
  findActiveLink(businessSlug: string, linkSlug: string): Promise<ResolvedLink | null>;
  recordVisit(link: ResolvedLink, visit: VisitRecord): Promise<void>;
}

export type RedirectDecision =
  | { kind: "not_found" }
  | { kind: "redirect"; location: string; pixelId: string | null; record: () => Promise<void> };

/**
 * Decide para onde o link público leva e prepara o registro do acesso.
 * O registro é devolvido como função para poder rodar depois da resposta
 * (via `after()`), deixando o redirecionamento instantâneo.
 */
export async function resolveRedirect(params: {
  businessSlug: string;
  linkSlug: string;
  request: Request;
  repo: LinkRepository;
  ipSalt: string;
  cardId?: string;
}): Promise<RedirectDecision> {
  const businessSlug = params.businessSlug.toLowerCase();
  const linkSlug = params.linkSlug.toLowerCase();
  if (!isValidSlug(businessSlug) || !isValidSlug(linkSlug)) return { kind: "not_found" };

  const link = await params.repo.findActiveLink(businessSlug, linkSlug);
  if (!link) return { kind: "not_found" };

  const requestUrl = new URL(params.request.url);
  const fromPage = requestUrl.searchParams.get(VIA_PARAM) === VIA_PAGE;
  let location: string | null = link.url;
  if (!location && link.type === "pix" && link.pix_key) {
    location = new URL(`/${businessSlug}/${linkSlug}/pix`, requestUrl).toString();
  }
  if (!location && link.type === "wifi") {
    location = new URL(`/${businessSlug}/${linkSlug}/wifi`, requestUrl).toString();
  }
  if (!location) return { kind: "not_found" };

  // Lê os dados agora: a requisição pode não estar disponível após a resposta.
  const headers = new Headers(params.request.headers);
  const searchParams = new URLSearchParams(requestUrl.searchParams);

  return {
    kind: "redirect",
    location,
    pixelId: !fromPage && isValidPixelId(link.meta_pixel_id) ? link.meta_pixel_id : null,
    record: async () => {
      const visit = await extractVisitInfo(headers, searchParams, params.ipSalt);
      await params.repo.recordVisit(link, params.cardId ? { ...visit, card_id: params.cardId } : visit);
    },
  };
}

/**
 * Resposta do link público: 302 direto ou, se o negócio tem Pixel, a página
 * de passagem que dispara o Pixel antes de seguir para o destino.
 */
export function redirectResponse(location: string, pixelId: string | null = null): Response {
  const headers = {
    // Sem cache: navegador/CDN não podem pular a contagem, e o destino pode mudar.
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
  };
  if (!pixelId) return new Response(null, { status: 302, headers: { ...headers, Location: location } });
  return new Response(buildPixelRedirectPage(pixelId, location), {
    status: 200,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
