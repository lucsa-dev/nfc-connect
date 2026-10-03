import { describe, expect, it } from "vitest";
import { isReservedBusinessSlug, isValidSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("remove acentos, espaços e pontuação", () => {
    expect(slugify("Padaria São João!")).toBe("padaria-sao-joao");
    expect(slugify("  Café & Cia.  ")).toBe("cafe-e-cia");
    expect(slugify("Avaliação Google")).toBe("avaliacao-google");
  });

  it("colapsa separadores repetidos", () => {
    expect(slugify("a  --  b__c")).toBe("a-b-c");
  });

  it("limita o tamanho sem terminar em hífen", () => {
    const slug = slugify("a".repeat(59) + " bbbb");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("retorna vazio quando não há caracteres válidos", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it.each(["ab", "padaria-sao-joao", "loja123", "a1-b2"])("aceita %s", (s) => {
    expect(isValidSlug(s)).toBe(true);
  });

  it.each(["a", "-abc", "abc-", "a--b", "Abc", "a b", "ção", "a".repeat(61)])(
    "rejeita %s",
    (s) => expect(isValidSlug(s)).toBe(false),
  );
});

describe("isReservedBusinessSlug", () => {
  it("bloqueia rotas do sistema", () => {
    expect(isReservedBusinessSlug("dashboard")).toBe(true);
    expect(isReservedBusinessSlug("login")).toBe(true);
    expect(isReservedBusinessSlug("padaria")).toBe(false);
  });
});
