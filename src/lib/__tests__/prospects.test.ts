import { describe, expect, it } from "vitest";
import { contactOf, prospectActorInput } from "@/lib/apify-maps";
import {
  instagramHandle,
  parseBrazilPhone,
  parsePriceCents,
  profileSummary,
  proposalFileName,
  proposalMessage,
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
