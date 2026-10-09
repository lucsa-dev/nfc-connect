import { formatBRL } from "@/lib/pricing";
import { isReservedBusinessSlug, isValidSlug, slugify } from "@/lib/slug";

export const LEAD_STATUS_LABEL = {
  lead: "Novo pedido",
  quiz: "Em andamento",
  convertido: "Convertido",
  descartado: "Descartado",
} as const;

/** Slugs a tentar para o negócio criado a partir de um lead (o 1º livre vence). */
export function businessSlugCandidates(name: string, city?: string | null): string[] {
  const base = slugify(name);
  const withCity = city ? slugify(`${name} ${city}`) : "";
  const candidates = [base, withCity, ...[2, 3, 4, 5].map((n) => (base ? `${base}-${n}` : ""))];
  return [...new Set(candidates)].filter((s) => isValidSlug(s) && !isReservedBusinessSlug(s));
}

/** Busca no Google Maps por nome e cidade ("Padaria Central, Fortaleza - CE"). */
export function mapsQueryOf(name: string, city?: string | null, state?: string | null): string | null {
  if (!city) return null;
  return `${name.trim()}, ${city.trim()}${state ? ` - ${state.trim()}` : ""}`.slice(0, 200);
}

/** Observações do negócio criado a partir do lead. */
export function leadDescription(lead: {
  contact_name: string | null;
  whatsapp: string | null;
  place_address: string | null;
  plaques: number | null;
  cards: number | null;
  total_cents: number | null;
  style: string | null;
}): string {
  const kit = [
    lead.plaques ? `${lead.plaques} ${lead.plaques === 1 ? "placa" : "placas"}` : null,
    lead.cards ? `${lead.cards} ${lead.cards === 1 ? "cartão" : "cartões"}` : null,
  ]
    .filter(Boolean)
    .join(" + ");
  return [
    lead.contact_name && `Contato: ${lead.contact_name}${lead.whatsapp ? ` · ${lead.whatsapp}` : ""}`,
    lead.place_address && `Endereço: ${lead.place_address}`,
    kit && `Pedido (quiz): ${kit}${lead.style ? `, estilo ${lead.style}` : ""}${lead.total_cents ? ` · ${formatBRL(lead.total_cents)}` : ""}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 500);
}
