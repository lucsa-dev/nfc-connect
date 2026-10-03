import { isValidSlug } from "@/lib/slug";
import { extractVisitInfo, type VisitInfo } from "@/lib/visit";

export interface ResolvedLink {
  id: string;
  business_id: string;
  url: string | null;
  type: string;
  pix_key: string | null;
}

export interface LinkRepository {
  findActiveLink(businessSlug: string, linkSlug: string): Promise<ResolvedLink | null>;
  recordVisit(link: ResolvedLink, visit: VisitInfo): Promise<void>;
}

export type RedirectDecision =
  | { kind: "not_found" }
  | { kind: "redirect"; location: string; record: () => Promise<void> };

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
}): Promise<RedirectDecision> {
  const businessSlug = params.businessSlug.toLowerCase();
  const linkSlug = params.linkSlug.toLowerCase();
  if (!isValidSlug(businessSlug) || !isValidSlug(linkSlug)) return { kind: "not_found" };

  const link = await params.repo.findActiveLink(businessSlug, linkSlug);
  if (!link) return { kind: "not_found" };

  const requestUrl = new URL(params.request.url);
  let location: string | null = link.url;
  if (!location && link.type === "pix" && link.pix_key) {
    location = new URL(`/${businessSlug}/${linkSlug}/pix`, requestUrl).toString();
  }
  if (!location) return { kind: "not_found" };

  // Lê os dados agora: a requisição pode não estar disponível após a resposta.
  const headers = new Headers(params.request.headers);
  const searchParams = new URLSearchParams(requestUrl.searchParams);

  return {
    kind: "redirect",
    location,
    record: async () => {
      const visit = await extractVisitInfo(headers, searchParams, params.ipSalt);
      await params.repo.recordVisit(link, visit);
    },
  };
}
