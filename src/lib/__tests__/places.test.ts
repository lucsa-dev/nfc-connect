import { describe, expect, it } from "vitest";
import { autocompleteBody, parseAutocomplete, parsePlaceDetails, reviewUrl } from "@/lib/places";

describe("autocompleteBody", () => {
  it("restringe ao Brasil e ao português", () => {
    expect(autocompleteBody("padaria", "tok")).toEqual({
      input: "padaria",
      sessionToken: "tok",
      languageCode: "pt-BR",
      includedRegionCodes: ["br"],
    });
  });
});

describe("parseAutocomplete", () => {
  it("extrai id, nome e endereço e ignora sugestões sem lugar", () => {
    const result = parseAutocomplete({
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJ1",
            text: { text: "Padaria Central, Rua A" },
            structuredFormat: { mainText: { text: "Padaria Central" }, secondaryText: { text: "Rua A, Fortaleza" } },
          },
        },
        { placePrediction: { placeId: "ChIJ2", text: { text: "Café Sol" } } },
        {},
      ],
    });
    expect(result).toEqual([
      { placeId: "ChIJ1", name: "Padaria Central", secondary: "Rua A, Fortaleza" },
      { placeId: "ChIJ2", name: "Café Sol", secondary: "" },
    ]);
    expect(parseAutocomplete({})).toEqual([]);
  });
});

describe("parsePlaceDetails", () => {
  it("lê os campos usados no quiz e a avaliação mais recente", () => {
    const info = parsePlaceDetails({
      id: "ChIJ1",
      displayName: { text: "Padaria Central" },
      formattedAddress: "Rua A, 1 - Centro, Fortaleza - CE",
      addressComponents: [
        { longText: "Fortaleza", types: ["administrative_area_level_2", "political"] },
        { longText: "Ceará", shortText: "CE", types: ["administrative_area_level_1"] },
      ],
      rating: 4.6,
      userRatingCount: 56,
      primaryTypeDisplayName: { text: "Padaria" },
      googleMapsUri: "https://maps.google.com/?cid=1",
      businessStatus: "OPERATIONAL",
      reviews: [{ publishTime: "2026-08-01T10:00:00Z" }, { publishTime: "2026-09-20T10:00:00Z" }, {}],
    });
    expect(info).toEqual({
      placeId: "ChIJ1",
      name: "Padaria Central",
      address: "Rua A, 1 - Centro, Fortaleza - CE",
      city: "Fortaleza",
      state: "CE",
      rating: 4.6,
      reviews: 56,
      category: "Padaria",
      mapsUrl: "https://maps.google.com/?cid=1",
      businessStatus: "OPERATIONAL",
      lastReviewAt: "2026-09-20T10:00:00Z",
    });
  });

  it("negócio sem avaliações: o Google omite nota e total", () => {
    expect(parsePlaceDetails({ id: "x", displayName: { text: "Novo" } })).toMatchObject({ rating: null, reviews: 0, lastReviewAt: null });
  });
});

describe("reviewUrl", () => {
  it("abre direto a tela de escrever avaliação", () => {
    expect(reviewUrl("ChIJ1")).toBe("https://search.google.com/local/writereview?placeid=ChIJ1");
  });
});
