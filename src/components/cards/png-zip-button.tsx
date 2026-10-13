"use client";

import { ImagesIcon, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { PrintArt, type ArtData } from "@/components/cards/print-art";
import { Button } from "@/components/ui/button";
import { CARD_COPY, displayUrl, getProduct, productSize, qrPath, type ProductId, type StyleId } from "@/lib/card";
import { setPngDpi } from "@/lib/png";
import { createZip, type ZipEntry } from "@/lib/zip";

/** Resolução das imagens: a mesma que as gráficas pedem. */
const DPI = 300;
const SIDE_NAME = { front: "frente", back: "verso" } as const;

/** @font-face da Poppins com os arquivos embutidos: SVG aberto como imagem não enxerga as fontes da página. */
async function embeddedFontCss() {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      continue; // folha de outra origem
    }
    for (const rule of Array.from(cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family");
      if (!/poppins/i.test(family) || /fallback/i.test(family)) continue;
      const src = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!src) continue;
      const blob = await (await fetch(src)).blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const range = rule.style.getPropertyValue("unicode-range");
      rules.push(
        `@font-face{font-family:'Poppins';font-style:normal;font-weight:${rule.style.getPropertyValue("font-weight") || 400};src:url(${dataUrl});${range ? `unicode-range:${range};` : ""}}`,
      );
    }
  }
  return rules.join("");
}

async function svgImage(markup: string) {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * O navegador carrega a fonte embutida no SVG de forma assíncrona: sem isso, a
 * primeira imagem sai sem texto. Desenha um texto de teste até ele aparecer.
 */
async function warmUpFont(fontCss: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><style>${fontCss}</style>${[500, 600]
    .map((w, i) => `<text x="0" y="${28 + i * 30}" font-size="28" font-weight="${w}" font-family="Poppins">Ag</text>`)
    .join("")}</svg>`;
  for (let attempt = 0; attempt < 40; attempt++) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(await svgImage(markup), 0, 0);
    if (ctx.getImageData(0, 0, 64, 64).data.some((v, i) => i % 4 === 3 && v > 0)) {
      // Mais um ciclo para os dois pesos terminarem de carregar.
      await new Promise((r) => setTimeout(r, 100));
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function svgToPng(svg: SVGSVGElement, fontCss: string, widthMm: number, heightMm: number) {
  const width = Math.round((widthMm / 25.4) * DPI);
  const height = Math.round((heightMm / 25.4) * DPI);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  // A variável CSS da fonte não existe fora da página.
  clone.querySelectorAll<SVGElement>("[style]").forEach((el) => {
    if (el.style.fontFamily) el.style.fontFamily = "Poppins, Arial, sans-serif";
  });
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = fontCss;
  clone.prepend(style);

  const image = await svgImage(new XMLSerializer().serializeToString(clone));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Falha ao gerar o PNG");
  return setPngDpi(new Uint8Array(await blob.arrayBuffer()), DPI);
}

/**
 * Baixa um .zip com um PNG por lado de cada peça do lote (300 DPI, com sangria,
 * como a arte da gráfica), gerado no navegador. O fundo sai transparente: a cor
 * vem do material (placa branca no estilo claro, escura no escuro).
 */
export function PngZipButton({
  product: productId,
  style,
  cards,
  filename,
}: {
  product: ProductId;
  style: StyleId;
  /** Peças na ordem de impressão, com a URL do QR Code. */
  cards: Array<{ position: number; code: string; qrUrl: string }>;
  filename: string;
}) {
  const [progress, setProgress] = useState<string | null>(null);

  async function generate() {
    const product = getProduct(productId);
    const { fullWidth, fullHeight } = productSize(product);
    const digits = Math.max(3, String(cards.length).length);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-10000px;top:0;";
    document.body.append(container);
    const root = createRoot(container);

    try {
      setProgress("Preparando…");
      await document.fonts.ready;
      const fontCss = await embeddedFontCss();
      await warmUpFont(fontCss);
      const entries: ZipEntry[] = [];

      for (const [i, card] of cards.entries()) {
        setProgress(`${i + 1} de ${cards.length}`);
        const data: ArtData = { businessName: null, copy: CARD_COPY.review, qr: qrPath(card.qrUrl), url: displayUrl(card.qrUrl) };
        flushSync(() =>
          root.render(
            product.sides.map((side) => <PrintArt key={side} product={product.id} style={style} side={side} data={data} bleed transparent />),
          ),
        );
        const svgs = Array.from(container.querySelectorAll("svg"));
        for (const [s, side] of product.sides.entries()) {
          const suffix = product.sides.length > 1 ? `-${SIDE_NAME[side]}` : "";
          entries.push({
            name: `${String(card.position).padStart(digits, "0")}-${card.code}${suffix}.png`,
            data: await svgToPng(svgs[s]!, fontCss, fullWidth, fullHeight),
          });
        }
      }

      const url = URL.createObjectURL(new Blob([createZip(entries)], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar as imagens.");
    } finally {
      root.unmount();
      container.remove();
      setProgress(null);
    }
  }

  return (
    <Button variant="outline" onClick={generate} disabled={progress !== null}>
      {progress ? <LoaderCircleIcon className="animate-spin" /> : <ImagesIcon />}
      {progress ?? "Imagens (ZIP)"}
    </Button>
  );
}
