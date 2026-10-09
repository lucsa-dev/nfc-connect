import { describe, expect, it } from "vitest";
import { mapsActorInput, matchApifyItems, namesMatch, normalizeSearchQuery, parseApifyPlace, searchActorInput, searchStringFor, type ApifyPlaceItem } from "@/lib/apify-maps";
import { profileChecks } from "@/lib/google-score";

const item: ApifyPlaceItem = {
  searchString: "Padaria Central, Fortaleza - CE",
  title: "Padaria Central",
  placeId: "ChIJabcdefghijklmnopqrstuvw",
  url: "https://www.google.com/maps/place/?q=place_id:ChIJabc",
  categoryName: "Padaria",
  categories: ["Padaria", "Café"],
  address: "Rua A, 10 - Centro, Fortaleza - CE",
  city: "Fortaleza",
  state: "Ceará",
  totalScore: 4.6,
  reviewsCount: 230,
  reviewsDistribution: { oneStar: 5, twoStar: 3, threeStar: 12, fourStar: 40, fiveStar: 170 },
  imagesCount: 87,
  website: "https://padaria.com.br",
  phone: "(85) 3333-4444",
  openingHours: [
    { day: "segunda-feira", hours: "06:00 to 20:00" },
    { day: "domingo", hours: "Fechado" },
  ],
  permanentlyClosed: false,
  temporarilyClosed: false,
  reviews: [
    { text: "Pão ótimo", stars: 5, publishedAtDate: "2026-10-01T10:00:00.000Z", responseFromOwnerText: "Obrigado!" },
    { text: "Demorou", stars: 2, publishedAtDate: "2026-10-05T10:00:00.000Z", responseFromOwnerText: null },
    { text: null, stars: 5, publishedAtDate: "2026-09-20T10:00:00.000Z" },
  ],
};

describe("mapsActorInput", () => {
  it("busca por Place ID quando houver, senão por nome e cidade, 1 resultado cada", () => {
    const input = mapsActorInput([
      { name: "Padaria Central", placeId: null, query: "Padaria Central, Fortaleza - CE" },
      { name: "Bar", placeId: "ChIJxyz", query: null },
      { name: "Sem cidade", placeId: null, query: null },
    ]);
    expect(input.searchStringsArray).toEqual(["Padaria Central, Fortaleza - CE", "place_id:ChIJxyz", "Sem cidade"]);
    expect(input).toMatchObject({ maxCrawledPlacesPerSearch: 1, language: "pt-BR", reviewsSort: "newest", scrapeReviewsPersonalData: false });
  });
});

describe("parseApifyPlace", () => {
  it("converte para o perfil usado no painel", () => {
    const profile = parseApifyPlace(item)!;
    expect(profile).toMatchObject({
      placeId: "ChIJabcdefghijklmnopqrstuvw",
      name: "Padaria Central",
      rating: 4.6,
      reviews: 230,
      photos: 87,
      photosCapped: false,
      businessStatus: "OPERATIONAL",
      lastReviewAt: "2026-10-05T10:00:00.000Z",
      hours: ["segunda-feira: 06:00 to 20:00", "domingo: Fechado"],
      ownerReplies: { replied: 1, total: 3 },
      distribution: [5, 3, 12, 40, 170],
      types: ["Padaria", "Café"],
    });
    expect(profile.sampleReviews[0]).toEqual({ rating: 5, text: "Pão ótimo", publishTime: "2026-10-01T10:00:00.000Z", ownerReplied: true });
  });

  it("marca fechado e ignora item sem placeId", () => {
    expect(parseApifyPlace({ ...item, permanentlyClosed: true })!.businessStatus).toBe("CLOSED_PERMANENTLY");
    expect(parseApifyPlace({ ...item, temporarilyClosed: true })!.businessStatus).toBe("CLOSED_TEMPORARILY");
    expect(parseApifyPlace({ title: "Sem id" })).toBeNull();
  });

  it("o checklist avalia a resposta do dono", () => {
    const checks = profileChecks(parseApifyPlace(item)!, new Date("2026-10-09T12:00:00Z"));
    expect(checks.find((c) => c.id === "replies")).toMatchObject({ ok: false });
    expect(checks.find((c) => c.id === "photos")!.ok).toBe(true);
  });
});

describe("matchApifyItems", () => {
  it("associa por Place ID ou pelo texto da busca", () => {
    const targets = [
      { businessId: "a", name: "Padaria Central", placeId: null, query: "Padaria Central, Fortaleza - CE" },
      { businessId: "b", name: "Bar do Zé", placeId: "ChIJbar000000000000000000000", query: null },
      { businessId: "c", name: "Não achado", placeId: null, query: "Não achado, Recife - PE" },
    ];
    const bar = { ...item, searchString: "place_id:ChIJbar000000000000000000000", placeId: "ChIJbar000000000000000000000", title: "Bar do Zé" };
    const result = matchApifyItems(targets, [item, bar]);
    expect(result.get("a")!.name).toBe("Padaria Central");
    expect(result.get("b")!.name).toBe("Bar do Zé");
    expect(result.has("c")).toBe(false);
  });

  it("descarta resultado de busca por nome que não bate com o negócio", () => {
    const wrong = { ...item, title: "Farmácia Popular" };
    const targets = [{ businessId: "a", name: "Padaria Central", placeId: null, query: item.searchString! }];
    expect(matchApifyItems(targets, [wrong]).size).toBe(0);
  });
});

describe("namesMatch e searchStringFor", () => {
  it("compara palavras significativas, sem acento", () => {
    expect(namesMatch("Padaria São João", "Padaria Sao Joao - Centro")).toBe(true);
    expect(namesMatch("Pizzaria do Zé", "Pizzaria Zé Delivery")).toBe(true);
    expect(namesMatch("Padaria Central", "Farmácia Popular")).toBe(false);
    expect(namesMatch("de", "Qualquer")).toBe(true); // nome sem palavras úteis: não bloqueia
  });

  it("prefere o Place ID", () => {
    expect(searchStringFor({ name: "X", placeId: "ChIJ1", query: "X, Y" })).toBe("place_id:ChIJ1");
    expect(searchStringFor({ name: "X", placeId: null, query: " X, Y " })).toBe("X, Y");
  });
});

describe("busca do quiz", () => {
  it("normaliza o texto para o cache", () => {
    expect(normalizeSearchQuery("  Padaria  São João\tFortaleza ")).toBe("padaria sao joao fortaleza");
    expect(normalizeSearchQuery("x".repeat(300))).toHaveLength(200);
  });

  it("pede poucos resultados e nenhuma avaliação", () => {
    expect(searchActorInput(" Padaria Central Fortaleza ")).toMatchObject({
      searchStringsArray: ["Padaria Central Fortaleza"],
      maxCrawledPlacesPerSearch: 3,
      maxReviews: 0,
      language: "pt-BR",
    });
  });
});
