/** Slugs usados nos segmentos públicos: /{negocio}/{link} */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MIN = 2;
export const SLUG_MAX = 60;

/**
 * Rotas do próprio app que não podem ser usadas como slug de negócio,
 * senão o negócio ficaria inacessível (rotas estáticas têm prioridade).
 */
export const RESERVED_BUSINESS_SLUGS = new Set([
  "api",
  "auth",
  "dashboard",
  "login",
  "logout",
  "admin",
  "_next",
  "static",
  "public",
  "favicon-ico",
  "robots-txt",
  "sitemap-xml",
]);

/** "Padaria São João!" -> "padaria-sao-joao" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN &&
    slug.length <= SLUG_MAX &&
    SLUG_PATTERN.test(slug)
  );
}

export function isReservedBusinessSlug(slug: string): boolean {
  return RESERVED_BUSINESS_SLUGS.has(slug);
}
