import { describe, expect, it } from "vitest";
import { pageLinkHref, sortPageLinks } from "@/lib/business-page";

describe("sortPageLinks", () => {
  it("põe a avaliação primeiro e mantém a ordem de criação no resto", () => {
    const links = [
      { slug: "insta", type: "business_card", created_at: "2026-01-01" },
      { slug: "wifi", type: "wifi", created_at: "2026-01-03" },
      { slug: "avaliacao", type: "review", created_at: "2026-01-02" },
    ];
    expect(sortPageLinks(links).map((l) => l.slug)).toEqual(["avaliacao", "insta", "wifi"]);
  });
});

describe("pageLinkHref", () => {
  it("marca o clique como vindo da página e mantém a origem QR", () => {
    expect(pageLinkHref("padaria", "wifi", "qr")).toBe("/padaria/wifi?de=pagina&s=qr");
    expect(pageLinkHref("padaria", "wifi", null)).toBe("/padaria/wifi?de=pagina");
  });
});
