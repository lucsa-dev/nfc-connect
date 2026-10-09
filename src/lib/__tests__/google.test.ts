import { describe, expect, it } from "vitest";
import { analysisRequestBody, parseAnalysisResponse, readAnalysis } from "@/lib/google-analysis";
import { profileChecks, profileScore } from "@/lib/google-score";
import { computeGrowth } from "@/lib/growth";
import { normalizeGoogleReviewUrl, parsePlaceProfile, readPlaceProfile, type PlaceProfile } from "@/lib/places";

const now = new Date("2026-10-09T12:00:00Z");

const profile: PlaceProfile = {
  placeId: "ChIJ1234567890",
  name: "Padaria Central",
  address: "Rua A, 10 - Centro, Fortaleza - CE",
  city: "Fortaleza",
  state: "CE",
  rating: 4.7,
  reviews: 120,
  category: "Padaria",
  mapsUrl: "https://maps.google.com/?cid=1",
  businessStatus: "OPERATIONAL",
  lastReviewAt: "2026-10-01T10:00:00Z",
  types: ["bakery"],
  website: "https://padaria.com.br",
  phone: "(85) 3333-4444",
  hours: ["segunda-feira: 06:00–20:00"],
  photos: 10,
  photosCapped: true,
  ownerReplies: null,
  distribution: null,
  summary: null,
  priceLevel: null,
  sampleReviews: [],
};

describe("parsePlaceProfile", () => {
  it("lê contato, horário, fotos e avaliações em destaque", () => {
    const parsed = parsePlaceProfile({
      id: "ChIJ1234567890",
      displayName: { text: "Padaria Central" },
      rating: 4.7,
      userRatingCount: 120,
      websiteUri: "https://padaria.com.br",
      nationalPhoneNumber: "(85) 3333-4444",
      regularOpeningHours: { weekdayDescriptions: ["segunda-feira: 06:00–20:00"] },
      photos: [{}, {}, {}],
      reviews: [{ rating: 5, publishTime: "2026-10-01T10:00:00Z", originalText: { text: "Ótimo pão" } }],
    });
    expect(parsed).toMatchObject({
      placeId: "ChIJ1234567890",
      website: "https://padaria.com.br",
      phone: "(85) 3333-4444",
      hours: ["segunda-feira: 06:00–20:00"],
      photos: 3,
      lastReviewAt: "2026-10-01T10:00:00Z",
      sampleReviews: [{ rating: 5, text: "Ótimo pão", publishTime: "2026-10-01T10:00:00Z" }],
    });
  });

  it("sem id não há perfil", () => {
    expect(parsePlaceProfile({ displayName: { text: "X" } })).toBeNull();
  });

  it("readPlaceProfile reconstrói o perfil salvo e rejeita lixo", () => {
    expect(readPlaceProfile(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
    expect(readPlaceProfile({ name: "sem id" })).toBeNull();
    expect(readPlaceProfile(null)).toBeNull();
  });
});

describe("checklist do perfil", () => {
  it("perfil completo tira 100", () => {
    const checks = profileChecks(profile, now);
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(profileScore(checks)).toBe(100);
  });

  it("aponta o que falta e pondera a nota", () => {
    const checks = profileChecks(
      { ...profile, rating: 4.1, reviews: 12, lastReviewAt: "2026-06-01T00:00:00Z", photos: 3, website: null, hours: [] },
      now,
    );
    const failed = checks.filter((c) => !c.ok).map((c) => c.id);
    expect(failed).toEqual(["rating", "reviews", "recent", "photos", "hours", "website"]);
    expect(profileScore(checks)).toBe(28); // 5 de 18 pontos
  });

  it("sem avaliações não conta a nota", () => {
    const checks = profileChecks({ ...profile, rating: null, reviews: 0 }, now);
    expect(checks.find((c) => c.id === "rating")!.ok).toBe(false);
  });
});

describe("análise da IA", () => {
  const analysis = {
    resumo: "Perfil forte.",
    nota: 82,
    pontos_fortes: ["Nota alta"],
    melhorias: [{ titulo: "Mais fotos", detalhe: "Adicione fotos.", impacto: "medio" }],
    argumento_venda: "Podemos ajudar.",
  };

  it("monta o pedido com Structured Outputs e os dados do perfil", () => {
    const body = analysisRequestBody(profile, "gpt-5-mini", now);
    expect(body.model).toBe("gpt-5-mini");
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(body.input).toContain("Padaria Central");
    expect(body.input).toContain('"nota_checklist": 100');
    expect(body.input).toContain('"fotos": "10 ou mais"');
  });

  it("lê o texto da resposta e valida o formato", () => {
    const json = {
      output: [
        { type: "reasoning" },
        { type: "message", content: [{ type: "output_text", text: JSON.stringify(analysis) }] },
      ],
    };
    expect(parseAnalysisResponse(json)).toEqual(analysis);
  });

  it("recusa, JSON inválido ou formato errado viram null", () => {
    expect(parseAnalysisResponse({ output: [{ type: "message", content: [{ type: "refusal", refusal: "não" }] }] })).toBeNull();
    expect(parseAnalysisResponse({ output: [{ type: "message", content: [{ type: "output_text", text: "{oops" }] }] })).toBeNull();
    expect(parseAnalysisResponse({ output: [{ type: "message", content: [{ type: "output_text", text: '{"nota": 5}' }] }] })).toBeNull();
    expect(readAnalysis(analysis)).toEqual(analysis);
    expect(readAnalysis({ ...analysis, nota: 150 })).toBeNull();
  });
});

describe("computeGrowth", () => {
  const point = (business_id: string, created_at: string, reviews: number, rating = 4.5) => ({ business_id, created_at, reviews, rating });

  it("calcula novas avaliações em 7 e 30 dias e desde o início", () => {
    const growth = computeGrowth(
      [
        point("a", "2026-10-08T09:00:00Z", 150, 4.8),
        point("a", "2026-08-01T09:00:00Z", 100, 4.5),
        point("a", "2026-09-07T09:00:00Z", 120),
        point("a", "2026-10-01T09:00:00Z", 140),
        point("b", "2026-10-08T09:00:00Z", 30),
      ],
      now,
    );

    expect(growth.get("a")).toMatchObject({
      reviews: 150,
      rating: 4.8,
      reviews7d: 10, // base: 01/10 (140)
      reviews30d: 30, // base: 07/09 (120)
      reviewsTotal: 50,
      ratingTotal: 0.3,
      firstAt: "2026-08-01T09:00:00Z",
      series: [100, 120, 140, 150],
    });
    // Uma coleta só: sem comparação.
    expect(growth.get("b")).toMatchObject({ reviews: 30, reviews7d: null, reviews30d: null, reviewsTotal: null });
  });

  it("sem coleta antiga o bastante, compara com a mais antiga disponível", () => {
    const growth = computeGrowth([point("a", "2026-10-05T09:00:00Z", 10), point("a", "2026-10-08T09:00:00Z", 14)], now);
    // Nenhuma coleta antes de 7 dias atrás: sem base.
    expect(growth.get("a")).toMatchObject({ reviews7d: null, reviews30d: null, reviewsTotal: 4 });
  });

  it("cliente sem coleta recente não mostra variação no período", () => {
    const growth = computeGrowth([point("a", "2026-08-01T09:00:00Z", 10), point("a", "2026-09-01T09:00:00Z", 20)], now);
    expect(growth.get("a")).toMatchObject({ reviews7d: null, reviews30d: null, reviewsTotal: 10 });
  });
});

describe("normalizeGoogleReviewUrl", () => {
  it("aceita links de avaliação e do Maps", () => {
    expect(normalizeGoogleReviewUrl("https://g.page/r/CAbc123/review")).toBe("https://g.page/r/CAbc123/review");
    expect(normalizeGoogleReviewUrl("g.page/r/CAbc123/review")).toBe("https://g.page/r/CAbc123/review");
    expect(normalizeGoogleReviewUrl("Avalie a gente: https://g.page/r/CAbc123/review obrigado")).toBe("https://g.page/r/CAbc123/review");
    expect(normalizeGoogleReviewUrl("https://maps.app.goo.gl/xYz12")).toBe("https://maps.app.goo.gl/xYz12");
    expect(normalizeGoogleReviewUrl("https://www.google.com.br/maps/place/Padaria")).toBe("https://www.google.com.br/maps/place/Padaria");
    expect(normalizeGoogleReviewUrl("http://search.google.com/local/writereview?placeid=abc")).toBe(
      "https://search.google.com/local/writereview?placeid=abc",
    );
  });

  it("recusa o que não é link do Google", () => {
    expect(normalizeGoogleReviewUrl("")).toBeNull();
    expect(normalizeGoogleReviewUrl("https://g.page/")).toBeNull();
    expect(normalizeGoogleReviewUrl("https://google.com/search?q=x")).toBeNull();
    expect(normalizeGoogleReviewUrl("https://evil.com/g.page/r/x")).toBeNull();
    expect(normalizeGoogleReviewUrl("https://g.page.evil.com/r/x")).toBeNull();
    expect(normalizeGoogleReviewUrl("javascript:alert(1)")).toBeNull();
  });
});
