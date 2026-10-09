import QRCode from "qrcode";
import type { LinkType } from "@/lib/link-types";

/** Medidas comuns de impressão, em milímetros. */
export const CARD = {
  /** Sangria: a arte passa do corte para não sobrar filete branco. */
  bleed: 3,
  /** Margem de segurança: textos e QR ficam a pelo menos 3 mm do corte. */
  safe: 3,
} as const;

export type Side = "front" | "back";

/**
 * Produtos impressos. A placa é o produto principal: fica colada no balcão,
 * então só tem frente (com NFC e QR Code). O cartão segue o padrão CR80
 * (ISO/IEC 7810 ID-1), o mesmo dos cartões NFC em PVC.
 */
export const PRODUCTS = [
  {
    id: "placa-quadrada",
    kind: "plaque",
    label: "Placa 10 × 10 cm",
    description: "Para colar no balcão ou no caixa",
    width: 100,
    height: 100,
    radius: 4,
    sides: ["front"],
  },
  {
    id: "placa-retangular",
    kind: "plaque",
    label: "Placa 10 × 15 cm",
    description: "Mais destaque no balcão ou na parede",
    width: 100,
    height: 150,
    radius: 4,
    sides: ["front"],
  },
  {
    id: "cartao",
    kind: "card",
    label: "Cartão horizontal",
    description: "Tamanho de cartão de crédito (8,6 × 5,4 cm), frente e verso",
    width: 85.6,
    height: 54,
    radius: 3.18,
    sides: ["front", "back"],
  },
  {
    id: "cartao-vertical",
    kind: "card",
    label: "Cartão vertical",
    description: "Cartão de crédito em pé (5,4 × 8,6 cm), frente e verso",
    width: 54,
    height: 85.6,
    radius: 3.18,
    sides: ["front", "back"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  kind: "plaque" | "card";
  label: string;
  description: string;
  width: number;
  height: number;
  radius: number;
  sides: readonly Side[];
}>;

export type Product = (typeof PRODUCTS)[number];
export type ProductId = Product["id"];

export function getProduct(id: string | null | undefined): Product {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

export function productSize(product: { width: number; height: number }) {
  const { width, height } = product;
  return { width, height, fullWidth: width + CARD.bleed * 2, fullHeight: height + CARD.bleed * 2 };
}

/** Estilos de cor, válidos para todos os produtos. */
export const STYLES = [
  { id: "classico", label: "Clássico", description: "Fundo branco, cores da marca" },
  { id: "escuro", label: "Escuro", description: "Fundo grafite, elegante" },
  { id: "azul", label: "Azul", description: "Fundo azul, alto destaque" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];

export function getStyle(id: string | null | undefined) {
  return STYLES.find((t) => t.id === id) ?? STYLES[0];
}

export interface CardCopy {
  headline: string;
  subline: string;
  /** Área do NFC */
  cta: string;
  /** Verso do cartão / legenda do QR */
  back: string;
}

/** Textos do cartão conforme o produto. */
export const CARD_COPY: Record<LinkType, CardCopy> = {
  review: {
    headline: "Gostou? Avalie a gente!",
    subline: "Sua avaliação no Google",
    cta: "Aproxime o celular",
    back: "Escaneie para avaliar",
  },
  pix: {
    headline: "Pague com Pix",
    subline: "Rápido e sem digitar nada",
    cta: "Aproxime o celular",
    back: "Escaneie para pagar",
  },
  business_card: {
    headline: "Vamos nos conectar?",
    subline: "Siga e acompanhe as novidades",
    cta: "Aproxime o celular",
    back: "Escaneie para acessar",
  },
  other: {
    headline: "Acesse com um toque",
    subline: "Sem digitar nada",
    cta: "Aproxime o celular",
    back: "Escaneie para acessar",
  },
};

/**
 * Tamanho de fonte (mm) para que `text` caiba em `maxWidth` mm.
 * Usa a largura média de caractere da Poppins semibold (~0,58 em).
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  { max, min, charWidth = 0.58 }: { max: number; min: number; charWidth?: number },
): number {
  const length = Math.max(1, [...text.trim()].length);
  const size = maxWidth / (length * charWidth);
  return Math.round(Math.min(max, Math.max(min, size)) * 100) / 100;
}

/**
 * QR Code como um único path SVG em unidades de módulo (0..size).
 * Une módulos escuros vizinhos na mesma linha para um path menor.
 */
export function qrPath(value: string): { size: number; d: string } {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const { size } = modules;
  const parts: string[] = [];
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!modules.get(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < size && modules.get(row, col)) col++;
      parts.push(`M${start} ${row}h${col - start}v1h-${col - start}z`);
    }
  }
  return { size, d: parts.join("") };
}

/** URL sem protocolo, para imprimir legível no cartão. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\?.*$/, "").replace(/\/$/, "");
}

/** Posições (mm) das peças numa folha A4, com espaço para cortar. */
export function sheetLayout(
  product: { width: number; height: number },
  { pageWidth = 210, pageHeight = 297, gap = 4, margin = 5 } = {},
) {
  const { width, height } = product;
  const cols = Math.max(1, Math.floor((pageWidth - 2 * margin + gap) / (width + gap)));
  const rows = Math.max(1, Math.floor((pageHeight - 2 * margin + gap) / (height + gap)));
  const usedW = cols * width + (cols - 1) * gap;
  const usedH = rows * height + (rows - 1) * gap;
  const offsetX = (pageWidth - usedW) / 2;
  const offsetY = (pageHeight - usedH) / 2;
  const positions: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      positions.push({ x: offsetX + c * (width + gap), y: offsetY + r * (height + gap) });
  return { cols, rows, width, height, positions };
}

/** Quebra um texto em até 2 linhas equilibradas (sem cortar palavras). */
export function balanceLines(text: string): [string] | [string, string] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return [text.trim()];
  let best: [string, string] = [words[0]!, words.slice(1).join(" ")];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      best = [a, b];
      bestDiff = diff;
    }
  }
  return best;
}
