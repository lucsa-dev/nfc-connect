import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import {
  CARD,
  CARD_COPY,
  displayUrl,
  fitFontSize,
  getProduct,
  getStyle,
  PRODUCTS,
  productSize,
  qrPath,
  sheetLayout,
} from "@/lib/card";
import { LINK_TYPES } from "@/lib/link-types";

describe("produtos", () => {
  it("a placa é o produto padrão e só tem frente", () => {
    const plaque = getProduct(null);
    expect(plaque.kind).toBe("plaque");
    expect(plaque.sides).toEqual(["front"]);
    expect(getProduct("xyz").id).toBe(PRODUCTS[0].id);
  });

  it("o cartão segue o padrão CR80 e tem frente e verso", () => {
    const card = getProduct("cartao");
    expect([card.width, card.height]).toEqual([85.6, 54]);
    expect(card.sides).toEqual(["front", "back"]);
    expect(getProduct("cartao-vertical")).toMatchObject({ width: 54, height: 85.6 });
  });

  it("acrescenta 3 mm de sangria em cada lado", () => {
    expect(productSize(getProduct("cartao"))).toEqual({ width: 85.6, height: 54, fullWidth: 91.6, fullHeight: 60 });
    expect(productSize(getProduct("placa-quadrada"))).toMatchObject({ fullWidth: 106, fullHeight: 106 });
    expect(CARD.safe).toBeGreaterThanOrEqual(3);
  });
});

describe("getStyle", () => {
  it("cai no estilo clássico quando o id é desconhecido", () => {
    expect(getStyle("escuro").id).toBe("escuro");
    expect(getStyle("vertical").id).toBe("classico");
  });
});

describe("CARD_COPY", () => {
  it("tem textos para todos os tipos de link", () => {
    for (const type of LINK_TYPES) expect(CARD_COPY[type].headline).toBeTruthy();
  });
});

describe("fitFontSize", () => {
  it("usa o tamanho máximo para textos curtos", () => {
    expect(fitFontSize("Café", 60, { max: 5, min: 2.5 })).toBe(5);
  });

  it("reduz para textos longos, respeitando o mínimo", () => {
    const size = fitFontSize("Restaurante e Pizzaria Bella Napoli", 60, { max: 5, min: 2.5 });
    expect(size).toBeLessThan(5);
    expect(size).toBeGreaterThanOrEqual(2.5);
    expect(fitFontSize("x".repeat(200), 60, { max: 5, min: 2.5 })).toBe(2.5);
  });

  it("conta acentos como um caractere", () => {
    expect(fitFontSize("Ação", 10, { max: 99, min: 0 })).toBe(fitFontSize("Acao", 10, { max: 99, min: 0 }));
  });
});

describe("qrPath", () => {
  it("gera um path que cobre exatamente os módulos escuros do QR", () => {
    const value = "https://toptap.com.br/padaria/avaliacao?s=qr";
    const { size, d } = qrPath(value);
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    expect(size).toBe(modules.size);

    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (modules.get(r, c)) dark++;
    const covered = [...d.matchAll(/h(\d+)v1/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(covered).toBe(dark);
  });
});

describe("displayUrl", () => {
  it("remove protocolo, query e barra final", () => {
    expect(displayUrl("https://toptap.com.br/padaria/avaliacao?s=qr")).toBe("toptap.com.br/padaria/avaliacao");
  });
});

describe("sheetLayout", () => {
  function fits(layout: ReturnType<typeof sheetLayout>) {
    for (const p of layout.positions) {
      expect(p.x).toBeGreaterThanOrEqual(5);
      expect(p.x + layout.width).toBeLessThanOrEqual(210 - 5 + 1e-9);
      expect(p.y + layout.height).toBeLessThanOrEqual(297 - 5 + 1e-9);
    }
  }

  it("cabe 10 cartões horizontais e 9 verticais numa folha A4", () => {
    const h = sheetLayout(getProduct("cartao"));
    expect(h.positions).toHaveLength(10);
    fits(h);
    expect(sheetLayout(getProduct("cartao-vertical")).positions).toHaveLength(9);
  });

  it("cabe 2 placas 10 × 10 e 1 placa 10 × 15 numa folha A4", () => {
    const square = sheetLayout(getProduct("placa-quadrada"));
    expect(square.positions).toHaveLength(2);
    fits(square);
    expect(sheetLayout(getProduct("placa-retangular")).positions).toHaveLength(1);
  });

  it("sempre posiciona pelo menos uma peça", () => {
    expect(sheetLayout({ width: 300, height: 300 }).positions).toHaveLength(1);
  });
});

import { balanceLines } from "@/lib/card";

describe("balanceLines", () => {
  it("divide em duas linhas de tamanho parecido", () => {
    expect(balanceLines("Escaneie para avaliar")).toEqual(["Escaneie", "para avaliar"]);
    expect(balanceLines("Gostou? Avalie a gente!")).toEqual(["Gostou? Avalie", "a gente!"]);
  });

  it("mantém uma palavra só em uma linha", () => {
    expect(balanceLines("  Avalie ")).toEqual(["Avalie"]);
  });
});
