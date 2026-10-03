import { describe, expect, it } from "vitest";
import { buildPublicLinkUrl, getSiteUrl, normalizeDestinationUrl } from "@/lib/urls";

describe("buildPublicLinkUrl", () => {
  it("gera a URL da TAG NFC no formato /{negocio}/{link}", () => {
    expect(buildPublicLinkUrl("https://meudominio.com.br", "padaria", "avaliacao")).toBe(
      "https://meudominio.com.br/padaria/avaliacao",
    );
  });

  it("adiciona ?s=qr na URL do QR Code", () => {
    expect(buildPublicLinkUrl("https://x.com/", "padaria", "pix", "qr")).toBe(
      "https://x.com/padaria/pix?s=qr",
    );
  });

  it("não duplica barras da base", () => {
    expect(buildPublicLinkUrl("https://x.com///", "a1", "b2")).toBe("https://x.com/a1/b2");
  });
});

describe("getSiteUrl", () => {
  it("prioriza NEXT_PUBLIC_SITE_URL", () => {
    expect(
      getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://meu.com/", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://meu.com");
  });

  it("usa o domínio de produção da Vercel e depois o do deploy", () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "app.com", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://app.com",
    );
    expect(getSiteUrl({ VERCEL_URL: "x.vercel.app" })).toBe("https://x.vercel.app");
  });

  it("usa o fallback quando nada está definido", () => {
    expect(getSiteUrl({}, "http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("normalizeDestinationUrl", () => {
  it("mantém URLs válidas", () => {
    expect(normalizeDestinationUrl("https://g.page/r/abc/review")).toBe("https://g.page/r/abc/review");
  });

  it("adiciona https:// quando falta o protocolo", () => {
    expect(normalizeDestinationUrl("meusite.com.br")).toBe("https://meusite.com.br/");
  });

  it("converte @perfil em link do Instagram", () => {
    expect(normalizeDestinationUrl("@padaria.sj")).toBe("https://instagram.com/padaria.sj");
  });

  it.each(["", "   ", "javascript:alert(1)", "ftp://site.com", "semdominio", "http://"])(
    "rejeita %j",
    (input) => expect(normalizeDestinationUrl(input)).toBeNull(),
  );
});
