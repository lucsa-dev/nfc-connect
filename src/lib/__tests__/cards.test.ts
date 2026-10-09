import { describe, expect, it, vi } from "vitest";
import { buildCardUrl, CODE_ALPHABET, CODE_PATTERN, generateCode, normalizeCode, resolveCard, type CardRepository, type ResolvedCard } from "@/lib/cards";

function repoWith(found: ResolvedCard | null) {
  return {
    findCard: vi.fn(async () => found),
    recordVisit: vi.fn(async () => {}),
  } satisfies CardRepository;
}

const activeLink = {
  id: "link-1",
  business_id: "biz-1",
  url: "https://search.google.com/local/writereview?placeid=abc",
  type: "review",
  pix_key: null,
  is_active: true,
  slug: "k7m2p9qa",
  business_slug: "padaria-central",
};

const request = (path: string) => new Request(`https://cards.com.br${path}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } });

describe("generateCode", () => {
  it("gera 8 caracteres do alfabeto sem caracteres ambíguos", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toMatch(CODE_PATTERN);
    }
    expect(CODE_ALPHABET).not.toMatch(/[01ilo]/);
    expect(CODE_ALPHABET).toHaveLength(31);
  });

  it("descarta bytes que enviesariam a distribuição", () => {
    // 248..255 ficam acima do maior múltiplo de 31 (248) e são ignorados.
    const random = vi
      .fn((n: number) => new Uint8Array(n).fill(31)) // 31 % 31 = 0 -> "2"
      .mockImplementationOnce((n) => new Uint8Array(n).fill(250));
    expect(generateCode(random)).toBe("22222222");
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("o padrão do código bate com o check do banco", () => {
    expect(CODE_PATTERN.source).toBe("^[2-9a-hjkmnp-z]{8}$");
  });
});

describe("normalizeCode e buildCardUrl", () => {
  it("aceita maiúsculas e espaços, rejeita códigos inválidos", () => {
    expect(normalizeCode(" K7M2P9QA ")).toBe("k7m2p9qa");
    expect(normalizeCode("k7m2p9q")).toBeNull();
    expect(normalizeCode("k7m2p9q0")).toBeNull();
    expect(normalizeCode("../admin")).toBeNull();
  });

  it("monta a URL do chip e a do QR Code", () => {
    expect(buildCardUrl("https://toptap.com.br/", "k7m2p9qa")).toBe("https://toptap.com.br/c/k7m2p9qa");
    expect(buildCardUrl("https://toptap.com.br", "k7m2p9qa", "qr")).toBe("https://toptap.com.br/c/k7m2p9qa?s=qr");
  });
});

describe("resolveCard", () => {
  it("peça em branco leva à ativação, sem registrar acesso", async () => {
    const repo = repoWith({ code: "k7m2p9qa", link: null });
    const decision = await resolveCard({ code: "K7M2P9QA", request: request("/c/K7M2P9QA?s=qr"), repo, ipSalt: "s" });
    expect(repo.findCard).toHaveBeenCalledWith("k7m2p9qa");
    expect(decision).toEqual({ kind: "activate", location: "https://cards.com.br/c/k7m2p9qa/ativar" });
    expect(repo.recordVisit).not.toHaveBeenCalled();
  });

  it("peça ativada redireciona para o link e registra o acesso com a origem", async () => {
    const repo = repoWith({ code: "k7m2p9qa", link: activeLink });
    const decision = await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa?s=qr"), repo, ipSalt: "s" });
    expect(decision.kind).toBe("redirect");
    if (decision.kind !== "redirect") return;
    expect(decision.location).toBe(activeLink.url);
    await decision.record();
    expect(repo.recordVisit).toHaveBeenCalledWith(activeLink, expect.objectContaining({ source: "qr" }));
  });

  it("link desativado ou código inexistente dá 404", async () => {
    const inactive = repoWith({ code: "k7m2p9qa", link: { ...activeLink, is_active: false } });
    expect(await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa"), repo: inactive, ipSalt: "s" })).toEqual({ kind: "not_found" });

    const missing = repoWith(null);
    expect(await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa"), repo: missing, ipSalt: "s" })).toEqual({ kind: "not_found" });

    const invalid = repoWith(null);
    expect(await resolveCard({ code: "x", request: request("/c/x"), repo: invalid, ipSalt: "s" })).toEqual({ kind: "not_found" });
    expect(invalid.findCard).not.toHaveBeenCalled();
  });
});
