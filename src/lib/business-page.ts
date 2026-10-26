import { SOURCE_PARAM, VIA_PAGE, VIA_PARAM } from "@/lib/urls";

/**
 * Página do negócio (/{negocio}): todos os links ativos, abertos pela peça no
 * modo automático quando há mais de um.
 */

interface PageLink {
  type: string;
  created_at: string;
}

/** Avaliação primeiro (é o produto); o resto na ordem em que foi criado. */
export function sortPageLinks<T extends PageLink>(links: T[]): T[] {
  return [...links].sort(
    (a, b) => Number(b.type === "review") - Number(a.type === "review") || a.created_at.localeCompare(b.created_at),
  );
}

/** Clique num link da página: conta o acesso e mantém a origem (NFC ou QR). */
export function pageLinkHref(businessSlug: string, linkSlug: string, source: string | null): string {
  const params = new URLSearchParams({ [VIA_PARAM]: VIA_PAGE });
  if (source === "qr") params.set(SOURCE_PARAM, "qr");
  return `/${encodeURIComponent(businessSlug)}/${encodeURIComponent(linkSlug)}?${params}`;
}
