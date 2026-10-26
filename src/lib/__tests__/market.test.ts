import { describe, expect, it } from "vitest";
import {
  marketActorInput,
  marketQuery,
  NEARBY_PLACES_PER_TERM,
  NEARBY_TERMS,
  nearbyActorInput,
  parseCompetitor,
  splitMarketItems,
  type ApifyPlaceItem,
} from "@/lib/apify-maps";
import {
  catchUpTargets,
  distanceMeters,
  estimatePace,
  fiveStarsToReach,
  formatDistance,
  formatMonths,
  hoursInsights,
  monthsToCatchUp,
  openDays,
  opportunityScore,
  profileGaps,
  rankProspects,
  ratingTargets,
  readMarketData,
  reviewsToPass,
  shareOfVoice,
  unansweredNegatives,
  type Competitor,
  type MarketData,
  monthlyReportSearch,
} from "@/lib/market";
import { marketAnalysisInput, readMarketAnalysis } from "@/lib/market-analysis";
import { gridPoints, parseTextSearchIds, rankIn, summarizeGrid, textSearchBody, type GridPoint } from "@/lib/rank-grid";

const now = new Date("2026-10-14T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function competitor(over: Partial<Competitor> = {}): Competitor {
  return {
    placeId: "ChIJcompetitor01",
    name: "Concorrente",
    rank: 1,
    rating: 4.6,
    reviews: 200,
    category: "Padaria",
    address: null,
    mapsUrl: null,
    location: null,
    website: true,
    phone: true,
    description: true,
    hours: [],
    photos: 50,
    lastReviewAt: daysAgo(1),
    distribution: null,
    replies: { replied: 8, total: 10 },
    recent: [],
    pace: 10,
    ...over,
  };
}

function market(over: Partial<MarketData> = {}): MarketData {
  return {
    version: 1,
    generatedAt: now.toISOString(),
    term: "padaria",
    area: "Aldeota, Fortaleza",
    client: competitor({ placeId: "ChIJclient000001", name: "Cliente", rank: 4, reviews: 50, pace: 2, rating: 4.4 }),
    competitors: [
      competitor({ placeId: "ChIJleader000001", name: "Líder", rank: 1, reviews: 300, pace: 6 }),
      competitor({ placeId: "ChIJnext00000001", name: "Próximo", rank: 2, reviews: 80, pace: 1 }),
      competitor({ placeId: "ChIJbehind000001", name: "Atrás", rank: 3, reviews: 20, pace: 1 }),
    ],
    clientPaceFromSnapshots: null,
    benchmarkPace: 12,
    plate: null,
    previousRank: null,
    previousAt: null,
    ...over,
  };
}

describe("estimatePace", () => {
  it("divide a amostra pelo período que ela cobre", () => {
    // 10 avaliações nos últimos 15 dias, de um total maior: ~20 por mês.
    const dates = Array.from({ length: 10 }, (_, i) => daysAgo(15 - i));
    expect(estimatePace(dates, 500, now)).toBe(20);
  });

  it("usa no mínimo 30 dias quando a amostra é o total de avaliações", () => {
    expect(estimatePace([daysAgo(1), daysAgo(2)], 2, now)).toBe(2);
  });

  it("ignora datas inválidas e vazias", () => {
    expect(estimatePace([null, "x"], 10, now)).toBe(0);
  });
});

describe("contas de nota e avaliações", () => {
  it("conta as 5 estrelas para a nota exibida chegar à meta (4,45 aparece como 4,5)", () => {
    // 10 avaliações com média 4,0: (10 * (4,45 - 4)) / (5 - 4,45) = 8,18 -> 9
    expect(fiveStarsToReach({ rating: 4, distribution: null, reviews: 10 }, 4.5)).toBe(9);
    expect(fiveStarsToReach({ rating: 4.5, distribution: null, reviews: 10 }, 4.5)).toBe(0);
    // Média 4,6 em 10: para aparecer 5,0 (4,95) são 70 seguidas.
    expect(fiveStarsToReach({ rating: 4.6, distribution: [1, 0, 0, 0, 9], reviews: 10 }, 5)).toBe(70);
    expect(fiveStarsToReach({ rating: null, distribution: null, reviews: 0 }, 4.5)).toBe(null);
  });

  it("usa a média exata da distribuição", () => {
    // [0,0,0,5,5] = 4,5 exato; para 4,6 (4,55): 10 * 0,05 / 0,45 = 1,11 -> 2
    expect(fiveStarsToReach({ rating: 4.5, distribution: [0, 0, 0, 5, 5], reviews: 10 }, 4.6)).toBe(2);
  });

  it("sugere o próximo décimo e os marcos acima", () => {
    expect(ratingTargets(4.3)).toEqual([4.4, 4.5, 4.8]);
    expect(ratingTargets(4.6)).toEqual([4.7, 4.8]);
    expect(ratingTargets(4.9)).toEqual([]);
  });

  it("calcula quanto falta e em quanto tempo", () => {
    expect(reviewsToPass({ reviews: 50 }, { reviews: 80 })).toBe(31);
    expect(reviewsToPass({ reviews: 90 }, { reviews: 80 })).toBe(0);
    expect(monthsToCatchUp(30, 4, 1)).toBe(10);
    expect(monthsToCatchUp(30, 1, 4)).toBe(null);
    expect(formatMonths(null)).toBe("não alcança no ritmo atual");
    expect(formatMonths(0.4)).toBe("menos de 1 mês");
    expect(formatMonths(2.2)).toBe("3 meses");
  });

  it("mira o próximo à frente e o 1º da busca, com e sem a placa", () => {
    const [next, leader] = catchUpTargets(market());
    expect(next).toMatchObject({ gap: 31, now: 31, label: "Próximo à frente em avaliações" });
    expect(next!.withPlate).toBeCloseTo(31 / 11);
    expect(leader).toMatchObject({ gap: 251, now: null, label: "1º lugar na busca" });
    expect(leader!.withPlate).toBeCloseTo(251 / 6);
  });

  it("prefere o ritmo das coletas ao estimado", () => {
    const share = shareOfVoice(market({ clientPaceFromSnapshots: 10 }));
    expect(share.find((s) => s.isClient)!.share).toBeCloseTo(10 / 18);
  });
});

describe("horário", () => {
  const weekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira"].map((d) => `${d}: 08:00–18:00`);

  it("lê os dias abertos em português e inglês", () => {
    expect([...openDays(["domingo: Fechado", "segunda-feira: 08:00–18:00", "Saturday: 9 AM–1 PM"])!].sort()).toEqual([1, 6]);
    expect(openDays([])).toBe(null);
  });

  it("aponta diferenciais e dias perdidos", () => {
    const client = { hours: [...weekdays.slice(0, 4), "sexta-feira: Fechado", "domingo: 08:00–12:00"] };
    const rivals = Array.from({ length: 3 }, () => ({ hours: [...weekdays, "domingo: Fechado"] }));
    expect(hoursInsights(client, rivals)).toEqual([
      { kind: "diferencial", day: 0, open: 0, of: 3 },
      { kind: "perdendo", day: 5, open: 3, of: 3 },
    ]);
  });

  it("avisa quando o perfil não tem horário", () => {
    expect(hoursInsights({ hours: [] }, [{ hours: weekdays }, { hours: weekdays }])).toEqual([
      { kind: "sem_horario", day: null, open: 2, of: 2 },
    ]);
  });
});

describe("perfil e avaliações", () => {
  it("lista o que a maioria dos concorrentes tem e o cliente não", () => {
    const client = competitor({ website: false, description: true, photos: 5, replies: { replied: 0, total: 10 } });
    const ids = profileGaps(client, [competitor(), competitor({ website: false })]).map((g) => g.id);
    expect(ids).toEqual(["site", "fotos", "respostas"]);
  });

  it("separa as negativas sem resposta, mais recentes primeiro", () => {
    const recent = [
      { stars: 2, date: daysAgo(10), replied: false, text: "Demorou" },
      { stars: 1, date: daysAgo(2), replied: false, text: "Frio" },
      { stars: 2, date: daysAgo(1), replied: true, text: "Respondida" },
      { stars: 5, date: daysAgo(1), replied: false, text: "Ótimo" },
      { stars: 3, date: daysAgo(1), replied: false, text: null },
    ];
    expect(unansweredNegatives({ recent }).map((r) => r.text)).toEqual(["Frio", "Demorou"]);
  });
});

describe("prospecção", () => {
  it("pontua mais quem tem nota boa e poucas avaliações para a região", () => {
    const good = opportunityScore(competitor({ rating: 4.7, reviews: 20, pace: 1, website: false, photos: 3, replies: { replied: 0, total: 5 } }), 200);
    const saturated = opportunityScore(competitor({ rating: 4.7, reviews: 2000, pace: 40 }), 200);
    expect(good.score).toBeGreaterThan(80);
    expect(good.reasons).toContain("Bem menos avaliações que a média da região");
    expect(saturated.score).toBeLessThan(20);
    expect(opportunityScore({ ...competitor(), closed: true }, 200)).toEqual({ score: 0, reasons: ["Fechado"] });
  });

  it("ordena pela nota de oportunidade", () => {
    const list = rankProspects([
      { ...competitor({ placeId: "a", reviews: 900, pace: 30 }), closed: false },
      { ...competitor({ placeId: "b", reviews: 10, pace: 0 }), closed: false },
    ]);
    expect(list.map((p) => p.placeId)).toEqual(["b", "a"]);
  });
});

describe("scraper: concorrentes", () => {
  const review = (stars: number, days: number, reply?: string) => ({ stars, publishedAtDate: daysAgo(days), text: `nota ${stars}`, responseFromOwnerText: reply });
  const item = (over: Partial<ApifyPlaceItem>): ApifyPlaceItem => ({
    title: "Padaria",
    placeId: "ChIJx",
    totalScore: 4.5,
    reviewsCount: 100,
    rank: 1,
    location: { lat: -3.73, lng: -38.5 },
    reviews: [review(5, 1), review(2, 3, "Obrigado")],
    ...over,
  });

  it("monta a busca do termo e do próprio negócio na mesma execução", () => {
    expect(marketQuery(" padaria ", "Aldeota ")).toBe("padaria em Aldeota");
    expect(marketActorInput("padaria", "Aldeota", "ChIJclient").searchStringsArray).toEqual(["padaria em Aldeota", "place_id:ChIJclient"]);
  });

  it("lê posição, localização e todas as avaliações", () => {
    const c = parseCompetitor(item({}), now)!;
    expect(c).toMatchObject({ rank: 1, location: { lat: -3.73, lng: -38.5 }, closed: false });
    expect(c.recent).toHaveLength(2);
    expect(c.recent[1]).toMatchObject({ stars: 2, replied: true });
  });

  it("separa o cliente (com a posição na busca) dos concorrentes, sem fechados", () => {
    const items = [
      item({ placeId: "ChIJa", rank: 1, searchString: "padaria em Aldeota" }),
      item({ placeId: "ChIJclient", rank: 2, searchString: "padaria em Aldeota", reviews: [] }),
      item({ placeId: "ChIJb", rank: 3, searchString: "padaria em Aldeota", permanentlyClosed: true }),
      item({ placeId: "ChIJclient", rank: 1, searchString: "place_id:ChIJclient" }),
    ];
    const { client, competitors } = splitMarketItems(items, "ChIJclient", now);
    expect(client).toMatchObject({ placeId: "ChIJclient", rank: 2 });
    expect(client!.recent).toHaveLength(2);
    expect(competitors.map((c) => c.placeId)).toEqual(["ChIJa"]);
  });

  it("deixa a posição vazia quando o cliente não aparece na busca", () => {
    const { client } = splitMarketItems([item({ placeId: "ChIJclient", rank: 1, searchString: "place_id:ChIJclient" })], "ChIJclient", now);
    expect(client!.rank).toBe(null);
  });
});

describe("mapa de ranking", () => {
  it("monta a grade com o negócio no centro", () => {
    const points = gridPoints({ lat: -3.7, lng: -38.5 }, 3, 1000);
    expect(points).toHaveLength(9);
    expect(points[4]).toEqual({ x: 1, y: 1, lat: -3.7, lng: -38.5 });
    // Linha de cima fica ao norte (latitude maior).
    expect(points[0]!.lat).toBeGreaterThan(points[6]!.lat);
    expect(points[0]!.lng).toBeLessThan(points[2]!.lng);
  });

  it("pede a busca com viés no ponto e lê só os ids", () => {
    expect(textSearchBody("padaria", { lat: 1, lng: 2 }).locationBias.circle.center).toEqual({ latitude: 1, longitude: 2 });
    const ids = parseTextSearchIds({ places: [{ id: "a" }, {}, { id: "b" }] });
    expect(ids).toEqual(["a", "b"]);
    expect(rankIn(ids, "b")).toBe(2);
    expect(rankIn(ids, "c")).toBe(null);
  });

  it("resume a grade", () => {
    const p = (rank: number | null, first: string): GridPoint => ({ x: 0, y: 0, lat: 0, lng: 0, rank, top: [first] });
    expect(summarizeGrid([p(1, "me"), p(5, "x"), p(null, "x")])).toEqual({
      top3: 1,
      found: 2,
      total: 3,
      average: 9,
      leader: { placeId: "x", points: 2 },
    });
  });
});

describe("leitura e IA", () => {
  it("valida o jsonb salvo", () => {
    expect(readMarketData(market())).not.toBe(null);
    expect(readMarketData({ version: 2 })).toBe(null);
    expect(readMarketAnalysis({ resumo: "x" })).toBe(null);
  });

  it("numera as negativas sem resposta para a IA responder", () => {
    const data = market();
    data.client.recent = [{ stars: 1, date: daysAgo(1), replied: false, text: "Ruim" }];
    const input = marketAnalysisInput(data);
    expect(input).toContain('"numero": 1');
    expect(input).toContain("padaria em Aldeota, Fortaleza");
  });
});

describe("perto de mim", () => {
  it("busca num círculo ao redor do vendedor, com todos os tipos quando não há termo", () => {
    const all = nearbyActorInput(null, { lat: -3.73, lng: -38.52 }, 1000);
    expect(all.customGeolocation).toEqual({ type: "Point", coordinates: [-38.52, -3.73], radiusKm: 1 });
    expect(all.searchStringsArray).toEqual([...NEARBY_TERMS]);
    expect(all.maxCrawledPlacesPerSearch).toBe(NEARBY_PLACES_PER_TERM);
    expect(nearbyActorInput("barbearia", { lat: 0, lng: 0 }, 500).searchStringsArray).toEqual(["barbearia"]);
  });

  it("mede e formata a distância", () => {
    // 0,01° de latitude ≈ 1,1 km
    expect(distanceMeters({ lat: -3.73, lng: -38.52 }, { lat: -3.72, lng: -38.52 })).toBeCloseTo(1112, -1);
    expect(formatDistance(347)).toBe("350 m");
    expect(formatDistance(1234)).toBe("1,2 km");
  });

  it("lê o bairro e a cidade do negócio", () => {
    const c = parseCompetitor({ title: "Bar", placeId: "ChIJbar", neighborhood: "Aldeota", city: "Fortaleza" }, now)!;
    expect(c.area).toBe("Aldeota, Fortaleza");
  });

  it("conta a apresentação do perfil na nota de oportunidade", () => {
    const { reasons } = opportunityScore(competitor({ website: false, description: false, hours: [], photos: 2 }), 200);
    expect(reasons).toContain("Perfil sem site, horário, fotos, descrição");
  });
});

describe("monthlyReportSearch", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  const report = (daysAgo: number, status = "ready", term = "padaria") => ({
    term,
    area: "Aldeota, Fortaleza",
    status,
    created_at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  });

  it("espera 30 dias desde o último relatório", () => {
    expect(monthlyReportSearch([report(29)], now)).toBeNull();
    expect(monthlyReportSearch([report(30)], now)).toEqual({ term: "padaria", area: "Aldeota, Fortaleza" });
  });

  it("conta o que ainda está gerando, mas não o que falhou", () => {
    expect(monthlyReportSearch([report(2, "running"), report(40)], now)).toBeNull();
    expect(monthlyReportSearch([report(2, "failed"), report(40)], now)).not.toBeNull();
  });

  it("repete a busca do último relatório pronto", () => {
    expect(monthlyReportSearch([report(60, "ready", "doceria"), report(35, "ready", "padaria")], now)).toEqual({
      term: "padaria",
      area: "Aldeota, Fortaleza",
    });
  });

  it("sem relatório pronto não tem busca para repetir", () => {
    expect(monthlyReportSearch([], now)).toBe("sem_base");
    expect(monthlyReportSearch([report(40, "failed")], now)).toBe("sem_base");
  });
});
