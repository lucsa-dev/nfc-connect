/** Preços em centavos. `null` = sob orçamento. */
export const PRICING = {
  plaque: 8000,
  card: null as number | null,
} as const;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
