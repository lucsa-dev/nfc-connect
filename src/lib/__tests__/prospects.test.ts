import { describe, expect, it } from "vitest";
import { contactOf, prospectActorInput } from "@/lib/apify-maps";
import { opportunityScore, type Prospect } from "@/lib/market";
import { nearbyTextBody, nearbyTypesBody, parseSearchPage, prospectFromProfile, regionSearchBody, SEARCH_FIELD_MASK } from "@/lib/places-prospect";
import {
  contactsFromHtml,
  instagramHandle,
  parseBrazilPhone,
  parsePriceCents,
  profileSummary,
  proposalFileName,
  proposalMessage,
  prospectSheetRows,
  prospectWhatsappHref,
} from "@/lib/prospects";

describe("parseBrazilPhone", () => {
  it("lê celular e fixo do Google", () => {
    expect(parseBrazilPhone("(85) 99999-8888")).toEqual({ e164: "5585999998888", mobile: true });
    expect(parseBrazilPhone("+55 85 3333-4444")).toEqual({ e164: "558533334444", mobile: false });
  });

  it("recusa números sem DDD ou incompletos", () => {
    expect(parseBrazilPhone("3333-4444")).toBeNull();
    expect(parseBrazilPhone("")).toBeNull();
    expect(parseBrazilPhone(null)).toBeNull();
  });

  it("monta o link do WhatsApp com a mensagem", () => {
    expect(prospectWhatsappHref("(85) 99999-8888", "Olá!")).toBe("https://wa.me/5585999998888?text=Ol%C3%A1!");
    expect(prospectWhatsappHref("123", "Olá!")).toBeNull();
  });
});

describe("instagramHandle", () => {
  it("extrai o usuário de link ou @", () => {
    expect(instagramHandle("https://www.instagram.com/Padaria.X/?hl=pt")).toBe("padaria.x");
    expect(instagramHandle("@padaria_x")).toBe("padaria_x");
  });

  it("ignora links que não são de perfil", () => {
    expect(instagramHandle("https://instagram.com/p/abc123")).toBeNull();
    expect(instagramHandle("não é um usuário")).toBeNull();
  });
});

describe("parsePriceCents", () => {
  it("aceita formatos brasileiros", () => {
    expect(parsePriceCents("90")).toBe(9000);
    expect(parsePriceCents("R$ 1.200,50")).toBe(120050);
    expect(parsePriceCents("89,9")).toBe(8990);
  });

  it("vazio é proposta sem valor; texto é inválido", () => {
    expect(parsePriceCents("  ")).toBeNull();
    expect(parsePriceCents("abc")).toBe("invalid");
  });
});

describe("proposta", () => {
  it("resume o perfil", () => {
    expect(profileSummary({ rating: 4.8, reviews: 41 })).toBe("tem nota 4,8 com 41 avaliações no Google");
    expect(profileSummary({ reviews: 0 })).toBe("ainda não tem avaliações no Google");
    expect(profileSummary({})).toBeNull();
  });

  it("cumprimenta o contato pelo primeiro nome", () => {
    const message = proposalMessage({ name: "Padaria Central", contactName: "Ana Paula", data: { rating: 4.8, reviews: 41 } });
    expect(message.startsWith("Olá, Ana! Tudo bem?")).toBe(true);
    expect(message).toContain("Padaria Central no Google Maps: tem nota 4,8 com 41 avaliações");
  });

  it("gera o nome do arquivo sem acentos", () => {
    expect(proposalFileName("Pão & Café São João")).toBe("proposta-toptap-pao-cafe-sao-joao.pdf");
  });
});

describe("contatos do scraper", () => {
  it("pede os contatos na prospecção", () => {
    expect(prospectActorInput("padaria", "Fortaleza").scrapeContacts).toBe(true);
  });

  it("lê telefone, e-mails válidos e Instagram", () => {
    expect(
      contactOf({
        phone: "(85) 3333-4444",
        website: "https://padaria.com.br",
        emails: ["Contato@Padaria.com.br", "contato@padaria.com.br", "inválido"],
        instagrams: ["https://instagram.com/p/xyz", "https://www.instagram.com/padaria.central/"],
      }),
    ).toEqual({ phone: "(85) 3333-4444", website: "https://padaria.com.br", emails: ["contato@padaria.com.br"], instagram: "padaria.central" });
  });
});

describe("contactsFromHtml", () => {
  it("acha e-mails e o Instagram no site", () => {
    const html = `<a href="mailto:Contato@Padaria.com.br">fale</a> vendas&#64;padaria.com.br <img src="logo@2x.png">
      <a href="https://www.instagram.com/padaria.central/">IG</a>`;
    expect(contactsFromHtml(html)).toEqual({ emails: ["contato@padaria.com.br", "vendas@padaria.com.br"], instagram: "padaria.central" });
  });

  it("ignora e-mails de exemplo", () => {
    expect(contactsFromHtml("seu@example.com").emails).toEqual([]);
  });
});

describe("prospecção pela Places API", () => {
  const center = { lat: -3.73, lng: -38.5 };
  const place = {
    id: "ChIJ_abcdefghij",
    displayName: { text: "Padaria Central" },
    formattedAddress: "Rua X, 10 - Aldeota, Fortaleza - CE",
    rating: 4.8,
    userRatingCount: 41,
    businessStatus: "OPERATIONAL",
    nationalPhoneNumber: "(85) 99999-8888",
    websiteUri: "https://www.instagram.com/padaria.central/",
    location: { latitude: -3.731, longitude: -38.501 },
    reviews: [{ publishTime: "2026-01-10T00:00:00Z", rating: 5 }],
  };

  it("monta as buscas por região e perto de mim", () => {
    expect(regionSearchBody("padaria", "Fortaleza, CE", "tok")).toMatchObject({ textQuery: "padaria em Fortaleza, CE", pageSize: 20, pageToken: "tok" });
    expect(regionSearchBody("padaria", "Fortaleza")).not.toHaveProperty("pageToken");
    const box = nearbyTextBody("padaria", center, 1000).locationRestriction.rectangle;
    expect(box.low.latitude).toBeLessThan(center.lat);
    expect(box.high.longitude).toBeGreaterThan(center.lng);
    expect(nearbyTypesBody(["bakery"], center, 500).locationRestriction.circle.radius).toBe(500);
    expect(SEARCH_FIELD_MASK).toContain("places.nationalPhoneNumber");
    expect(SEARCH_FIELD_MASK).toContain("nextPageToken");
  });

  it("lê a página e converte em candidato, com o Instagram cadastrado como site", () => {
    const page = parseSearchPage({ places: [place, { displayName: { text: "Sem id" } }], nextPageToken: "next" });
    expect(page.profiles).toHaveLength(1);
    expect(page.nextPageToken).toBe("next");
    const p = prospectFromProfile(page.profiles[0]!, 3, new Date("2026-10-28"));
    expect(p).toMatchObject({ rank: 3, closed: false, paceUnknown: true, reviews: 41 });
    expect(p.contact).toEqual({ phone: "(85) 99999-8888", website: null, emails: [], instagram: "padaria.central" });
  });

  it("sem ritmo, pontua pela avaliação mais nova", () => {
    const base = { rating: 4.8, reviews: 41, pace: 0, replies: null, website: true, hours: ["seg"], photos: 10, description: true, paceUnknown: true };
    const now = new Date("2026-10-28");
    const old = opportunityScore({ ...base, lastReviewAt: "2026-01-10T00:00:00Z" }, 41, now);
    const recent = opportunityScore({ ...base, lastReviewAt: "2026-10-20T00:00:00Z" }, 41, now);
    expect(old.reasons).toContain("Poucas avaliações recentes");
    expect(recent.reasons).not.toContain("Poucas avaliações recentes");
    expect(recent.reasons).not.toContain("Quase não recebe avaliações novas");
    expect(old.score - recent.score).toBe(10);
  });
});

describe("planilha da busca", () => {
  const base = {
    placeId: "ChIJ_abc",
    name: "Padaria Central",
    rank: 2,
    rating: 4.8,
    reviews: 41,
    category: "Padaria",
    address: "Rua X, 10",
    mapsUrl: "https://maps.google.com/?cid=1",
    score: 72,
    reasons: ["Poucas avaliações", "Sem site"],
    closed: false,
    contact: { phone: "(85) 99999-8888", website: null, emails: ["a@b.com.br"], instagram: "padaria.central" },
  } as unknown as Prospect;
  const opts = { origin: "https://toptap.com.br", searchId: "s1", nearby: false, listed: new Map() };

  it("monta a linha com os links da proposta e do WhatsApp", () => {
    const [row] = prospectSheetRows([base], opts);
    expect(row).toMatchObject({
      Oportunidade: 72,
      "Posição / distância": "2º",
      Nota: "4,8",
      "Tipo de telefone": "celular",
      "E-mail": "a@b.com.br",
      Instagram: "https://instagram.com/padaria.central",
      Motivos: "Poucas avaliações; Sem site",
      Status: null,
      "Proposta (PDF)": "https://toptap.com.br/dashboard/prospeccao/s1/proposta/ChIJ_abc",
    });
    expect(row!.WhatsApp).toMatch(/^https:\/\/wa\.me\/5585999998888\?text=Ol%C3%A1!/);
  });

  it("mostra distância, status da lista e deixa o WhatsApp vazio sem telefone", () => {
    const p = { ...base, distanceM: 850, contact: { ...base.contact!, phone: null } } as Prospect;
    const [row] = prospectSheetRows([p], { ...opts, nearby: true, listed: new Map([["ChIJ_abc", { status: "enviado" }]]) });
    expect(row!["Posição / distância"]).toMatch(/850/);
    expect(row!.Status).toBe("Proposta enviada");
    expect(row!.WhatsApp).toBeNull();
    expect(row!["Tipo de telefone"]).toBeNull();
  });
});
