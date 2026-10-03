export type VisitSource = "nfc" | "qr";

/** Parâmetro de query que identifica a origem do acesso no link público. */
export const SOURCE_PARAM = "s";

/**
 * URL base pública. Ordem: NEXT_PUBLIC_SITE_URL > domínio de produção da
 * Vercel > URL do deploy da Vercel > fallback (ex.: origin da requisição).
 */
export function getSiteUrl(
  env: Record<string, string | undefined> = process.env,
  fallback = "http://localhost:3000",
): string {
  const raw =
    env.NEXT_PUBLIC_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (env.VERCEL_URL && `https://${env.VERCEL_URL}`) ||
    fallback;
  return raw.replace(/\/+$/, "");
}

/**
 * Link público gravado na TAG NFC (sem parâmetro) ou no QR Code (?s=qr),
 * para diferenciar a origem nas estatísticas.
 */
export function buildPublicLinkUrl(
  baseUrl: string,
  businessSlug: string,
  linkSlug: string,
  source?: VisitSource,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/${encodeURIComponent(businessSlug)}/${encodeURIComponent(linkSlug)}`;
  return source === "qr" ? `${url}?${SOURCE_PARAM}=qr` : url;
}

/**
 * Normaliza o destino digitado pelo usuário:
 * - "@perfil" -> https://instagram.com/perfil
 * - "meusite.com.br" -> https://meusite.com.br
 * Retorna null se não for uma URL http(s) válida.
 */
export function normalizeDestinationUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;

  const handle = /^@([A-Za-z0-9._]{1,30})$/.exec(value);
  if (handle) return `https://instagram.com/${handle[1]}`;

  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}
