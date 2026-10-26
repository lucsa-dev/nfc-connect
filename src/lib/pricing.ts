/**
 * Preços em centavos. Um serviço por estabelecimento: 1 placa no balcão, até
 * 5 adesivos QR (impressos na Niimbot) pelo ambiente e 12 relatórios mensais.
 * Adesivos além dos inclusos são cobrados por unidade.
 */
export const PRICING = {
  service: 9000,
  includedStickers: 5,
  extraSticker: 1500,
} as const;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
