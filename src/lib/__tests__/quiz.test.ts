import { describe, expect, it } from "vitest";
import type { PlaceInfo } from "@/lib/places";
import {
  describeKit,
  diagnose,
  estimateTimeline,
  formatBrPhone,
  goalLabel,
  goalOptions,
  kitPriceLabel,
  monthlyNewReviews,
  normalizeBrPhone,
  recommendKit,
  whatsappSummary,
} from "@/lib/quiz";

const place = (over: Partial<PlaceInfo> = {}): PlaceInfo => ({
  placeId: "ChIJ123",
  name: "Padaria Central",
  address: "Rua A, 1 - Fortaleza - CE",
  city: "Fortaleza",
  state: "CE",
  rating: 4.8,
  reviews: 120,
  category: "Padaria",
  mapsUrl: null,
  businessStatus: "OPERATIONAL",
  lastReviewAt: "2026-10-01T10:00:00Z",
  ...over,
});

describe("goalOptions", () => {
  it("oferece de 50 até 1.000 para quem tem poucas avaliações", () => {
    expect(goalOptions(0)).toEqual([50, 100, 250, 500, 1000]);
    expect(goalOptions(null)).toEqual([50, 100, 250, 500, 1000]);
  });

  it("começa no próximo degrau acima do total atual", () => {
    expect(goalOptions(56)).toEqual([100, 250, 500, 1000, 2500]);
    expect(goalOptions(430)).toEqual([500, 1000, 2500, 5000, 10000]);
  });

  it("todas as opções são maiores que o atual, mesmo acima da escada", () => {
    for (const c of [0, 24, 50, 99, 1234, 30000]) for (const g of goalOptions(c)) expect(g).toBeGreaterThan(c);
  });

  it("a maior opção aparece como 'ou mais'", () => {
    const options = goalOptions(0);
    expect(goalLabel(1000, options)).toBe("1.000 ou mais");
    expect(goalLabel(500, options)).toBe("500 avaliações");
  });
});

describe("projeção", () => {
  it("estima avaliações por mês de forma conservadora (1% dos clientes)", () => {
    expect(monthlyNewReviews("11_50")).toBe(8); // 30 × 26 × 1%
    expect(monthlyNewReviews("mais_300")).toBe(104);
    expect(monthlyNewReviews("ate_10")).toBe(2);
    expect(monthlyNewReviews(null)).toBe(8);
  });

  it("mostra o prazo como faixa", () => {
    expect(estimateTimeline(56, 120, "51_100")).toBe("3 a 4 meses"); // 64 / 20 = 3,2
    expect(estimateTimeline(0, 50, "11_50")).toBe("6 a 7 meses"); // 50 / 8 = 6,25
    expect(estimateTimeline(0, 16, "11_50")).toBe("2 a 3 meses"); // exatamente 2
    expect(estimateTimeline(100, 110, "mais_300")).toBe("menos de 1 mês");
    expect(estimateTimeline(0, 1000, "ate_10")).toBe("mais de 2 anos");
    expect(estimateTimeline(200, 100, "11_50")).toBe("meta já alcançada");
  });
});

describe("diagnose", () => {
  const now = new Date("2026-10-05T12:00:00Z");

  it("sem dados do Google não há diagnóstico", () => {
    expect(diagnose(null, now)).toEqual([]);
    expect(diagnose(place({ reviews: null, rating: null }), now)).toEqual([]);
  });

  it("negócio sem avaliações é crítico", () => {
    const d = diagnose(place({ reviews: 0, rating: null, lastReviewAt: null }), now);
    expect(d).toHaveLength(1);
    expect(d[0]!.tone).toBe("critico");
  });

  it("aponta poucas avaliações, nota baixa e avaliação antiga", () => {
    const d = diagnose(place({ reviews: 12, rating: 4.3, lastReviewAt: "2026-06-01T00:00:00Z" }), now);
    expect(d.map((i) => i.tone)).toEqual(["atencao", "atencao", "atencao"]);
    expect(d[0]!.text).toContain("Só 12 avaliações");
    expect(d[1]!.text).toContain("4,3");
    expect(d[2]!.text).toContain("há 4 meses");
  });

  it("avaliação de mais de um ano", () => {
    const d = diagnose(place({ lastReviewAt: "2025-01-01T00:00:00Z" }), now);
    expect(d[0]!.text).toContain("há mais de um ano");
  });

  it("tudo bem: mensagem positiva", () => {
    expect(diagnose(place(), now)).toEqual([{ tone: "bom", text: expect.stringContaining("Boa reputação") }]);
  });
});

describe("recommendKit", () => {
  it("balcão gera placas a R$ 80", () => {
    const kit = recommendKit({ spots: ["balcao"], counters: 2, tables: 0 });
    expect(kit).toEqual({ plaques: 2, cards: 0, totalCents: 16000, hasQuote: false });
    expect(describeKit(kit)).toBe("2 placas");
    expect(kitPriceLabel(kit)).toMatch(/R\$\s?160,00/);
  });

  it("mesas geram cartões sob orçamento", () => {
    const kit = recommendKit({ spots: ["balcao", "mesas"], counters: 1, tables: 8 });
    expect(kit).toMatchObject({ plaques: 1, cards: 8, totalCents: 8000, hasQuote: true });
    expect(describeKit(kit)).toBe("1 placa + 8 cartões");
    expect(kitPriceLabel(kit)).toContain("cartões sob orçamento");
  });

  it("sem resposta, recomenda 1 placa", () => {
    expect(recommendKit({ spots: [], counters: 0, tables: 0 })).toMatchObject({ plaques: 1, cards: 0 });
  });

  it("só cartões: preço todo sob orçamento", () => {
    const kit = recommendKit({ spots: ["atendente"], counters: 0, tables: 3 });
    expect(kit).toMatchObject({ plaques: 0, cards: 3, totalCents: 0 });
    expect(kitPriceLabel(kit)).toBe("sob orçamento");
  });
});

describe("telefone", () => {
  it.each([
    ["(85) 99999-8888", "+5585999998888"],
    ["85 3222-1111", "+558532221111"],
    ["+55 11 98765-4321", "+5511987654321"],
    ["011 98765-4321", "+5511987654321"],
  ])("%s", (input, expected) => expect(normalizeBrPhone(input)).toBe(expected));

  it.each(["", "9999-8888", "(85) 89999-8888", "(00) 99999-8888", "123"])("rejeita %j", (input) =>
    expect(normalizeBrPhone(input)).toBeNull(),
  );

  it("formata para exibição", () => {
    expect(formatBrPhone("+5585999998888")).toBe("(85) 99999-8888");
    expect(formatBrPhone("+558532221111")).toBe("(85) 3222-1111");
  });
});

describe("whatsappSummary", () => {
  it("resume o pedido", () => {
    const msg = whatsappSummary({
      name: " Ana ",
      business: place(),
      kit: recommendKit({ spots: ["balcao"], counters: 1, tables: 0 }),
      styleLabel: "Clássico",
      goal: 250,
    });
    expect(msg).toContain("Sou Ana e quero a placa TopTap.");
    expect(msg).toContain("Negócio: Padaria Central (Fortaleza)");
    expect(msg).toContain("Pedido: 1 placa · estilo Clássico");
    expect(msg).toContain("Meta: 250 avaliações");
  });
});
