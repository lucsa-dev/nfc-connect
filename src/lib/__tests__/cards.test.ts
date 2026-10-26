import { describe, expect, it, vi } from "vitest";
import { buildCardUrl, CODE_ALPHABET, CODE_PATTERN, generateCode, normalizeCode, pickCardLink, resolveCard, type CardLink, type CardRepository, type ResolvedCard } from "@/lib/cards";

function repoWith(found: ResolvedCard | null) {
  return {
    findCard: vi.fn(async () => found),
    recordVisit: vi.fn(async () => {}),
  } satisfies CardRepository;
}

const review: CardLink = {
  id: "link-1",
  business_id: "biz-1",
  url: "https://search.google.com/local/writereview?placeid=abc",
  type: "review",
  pix_key: null,
  is_active: true,
  slug: "avaliacao",
};
const wifi: CardLink = { ...review, id: "link-2", type: "wifi", url: null, slug: "wifi" };

const card = (links: CardLink[], direct_link_id: string | null = null, meta_pixel_id: string | null = null): ResolvedCard => ({
  id: "card-1",
  code: "k7m2p9qa",
  direct_link_id,
  business: { slug: "padaria-central", meta_pixel_id, links },
});

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

describe("pickCardLink", () => {
  it("automático: vai direto quando há um só link ativo, senão abre a página", () => {
    expect(pickCardLink(null, [review])).toBe(review);
    expect(pickCardLink(null, [review, { ...wifi, is_active: false }])).toBe(review);
    expect(pickCardLink(null, [review, wifi])).toBeNull();
    expect(pickCardLink(null, [])).toBeNull();
  });

  it("direto: vai para o link fixado enquanto ele estiver ativo", () => {
    expect(pickCardLink("link-2", [review, wifi])).toBe(wifi);
    expect(pickCardLink("link-2", [review, { ...wifi, is_active: false }])).toBe(review);
    expect(pickCardLink("apagado", [review, wifi])).toBeNull();
  });
});

describe("resolveCard", () => {
  it("peça em branco leva à ativação, sem registrar acesso", async () => {
    const repo = repoWith({ id: "card-1", code: "k7m2p9qa", direct_link_id: null, business: null });
    const decision = await resolveCard({ code: "K7M2P9QA", request: request("/c/K7M2P9QA?s=qr"), repo, ipSalt: "s" });
    expect(repo.findCard).toHaveBeenCalledWith("k7m2p9qa");
    expect(decision).toEqual({ kind: "activate", location: "https://cards.com.br/c/k7m2p9qa/ativar" });
    expect(repo.recordVisit).not.toHaveBeenCalled();
  });

  it("com um link, redireciona e registra o acesso com a peça e a origem", async () => {
    const repo = repoWith(card([review], null, "1234567890123456"));
    const decision = await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa?s=qr"), repo, ipSalt: "s" });
    expect(decision).toMatchObject({ kind: "redirect", location: review.url, pixelId: "1234567890123456" });
    if (decision.kind !== "redirect") return;
    await decision.record();
    expect(repo.recordVisit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "link-1" }),
      expect.objectContaining({ source: "qr", card_id: "card-1" }),
    );
  });

  it("fixada no Wi-Fi, vai para a página do Wi-Fi", async () => {
    const decision = await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa"), repo: repoWith(card([review, wifi], "link-2")), ipSalt: "s" });
    expect(decision).toMatchObject({ kind: "redirect", location: "https://cards.com.br/padaria-central/wifi/wifi" });
  });

  it("com vários links no automático, abre a página do negócio com a peça e a origem", async () => {
    const repo = repoWith(card([review, wifi]));
    const decision = await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa?s=qr&x=1"), repo, ipSalt: "s" });
    expect(decision).toEqual({ kind: "page", location: "https://cards.com.br/padaria-central?c=k7m2p9qa&s=qr" });
    expect(repo.recordVisit).not.toHaveBeenCalled();
  });

  it("código inexistente ou inválido dá 404", async () => {
    const missing = repoWith(null);
    expect(await resolveCard({ code: "k7m2p9qa", request: request("/c/k7m2p9qa"), repo: missing, ipSalt: "s" })).toEqual({ kind: "not_found" });

    const invalid = repoWith(null);
    expect(await resolveCard({ code: "x", request: request("/c/x"), repo: invalid, ipSalt: "s" })).toEqual({ kind: "not_found" });
    expect(invalid.findCard).not.toHaveBeenCalled();
  });
});
