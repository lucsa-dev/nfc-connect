import { describe, expect, it } from "vitest";
import { businessSchema, fieldErrorsOf, formDataToObject, linkSchema, loginSchema } from "@/lib/validation";

describe("businessSchema", () => {
  it("gera o slug a partir do nome quando vazio", () => {
    const r = businessSchema.parse({ name: "Padaria São João", slug: "" });
    expect(r).toEqual({ name: "Padaria São João", slug: "padaria-sao-joao", description: null, meta_pixel_id: null });
  });

  it("aceita slug customizado em minúsculas", () => {
    expect(businessSchema.parse({ name: "Padaria", slug: "PadariaSJ" }).slug).toBe("padariasj");
  });

  it("rejeita slug inválido ou reservado", () => {
    const invalid = businessSchema.safeParse({ name: "Padaria", slug: "a b" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(fieldErrorsOf(invalid.error).slug).toBeDefined();

    const reserved = businessSchema.safeParse({ name: "Dashboard" });
    expect(reserved.success).toBe(false);
    if (!reserved.success)
      expect(fieldErrorsOf(reserved.error).slug?.[0]).toMatch(/reservado/);
  });

  it("aceita o ID do Pixel só com números, ignorando espaços", () => {
    expect(businessSchema.parse({ name: "Padaria", meta_pixel_id: " 1234 5678 9012 3456 " }).meta_pixel_id).toBe("1234567890123456");
    const invalid = businessSchema.safeParse({ name: "Padaria", meta_pixel_id: "fbq('init')" });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(fieldErrorsOf(invalid.error).meta_pixel_id).toBeDefined();
  });

  it("exige nome", () => {
    expect(businessSchema.safeParse({ name: " " }).success).toBe(false);
  });
});

describe("linkSchema", () => {
  it("normaliza o link de cartão de visita", () => {
    const r = linkSchema.parse({ name: "Instagram", type: "business_card", url: "@padaria" });
    expect(r).toMatchObject({
      slug: "instagram",
      url: "https://instagram.com/padaria",
      is_active: true,
      pix_key: null,
    });
  });

  it("exige URL para links que não são Pix", () => {
    const r = linkSchema.safeParse({ name: "Avaliação", type: "review", url: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).url).toBeDefined();
  });

  it("aceita Pix por chave, normalizando chave e valor", () => {
    const r = linkSchema.parse({
      name: "Pagamento",
      type: "pix",
      url: "",
      pix_key: "529.982.247-25",
      pix_name: "Padaria SJ",
      pix_city: "Sao Paulo",
      pix_amount: "1.234,50",
    });
    expect(r).toMatchObject({ url: null, pix_key: "52998224725", pix_amount: 1234.5 });
  });

  it("aceita Pix apenas com URL de pagamento", () => {
    const r = linkSchema.parse({ name: "Pix", type: "pix", url: "https://nubank.com.br/pagar/abc" });
    expect(r.url).toBe("https://nubank.com.br/pagar/abc");
  });

  it("exige chave, nome e cidade no Pix sem URL", () => {
    const r = linkSchema.safeParse({ name: "Pix", type: "pix" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errors = fieldErrorsOf(r.error);
      expect(errors.pix_key).toBeDefined();
      expect(errors.pix_name).toBeDefined();
      expect(errors.pix_city).toBeDefined();
    }
  });

  it("descarta campos Pix em links de outros tipos", () => {
    const r = linkSchema.parse({ name: "Site", type: "other", url: "site.com", pix_key: "x" });
    expect(r.pix_key).toBeNull();
  });

  it("aceita Wi-Fi com rede e senha, sem URL", () => {
    const r = linkSchema.parse({ name: "Wi-Fi", type: "wifi", url: "site.com", wifi_ssid: " Padaria ", wifi_password: " a b " });
    expect(r).toMatchObject({ url: null, wifi_ssid: "Padaria", wifi_password: " a b ", pix_key: null });
    expect(linkSchema.parse({ name: "Wi-Fi", type: "wifi", wifi_ssid: "Aberta" }).wifi_password).toBeNull();
  });

  it("exige o nome da rede no Wi-Fi e descarta campos Wi-Fi em outros tipos", () => {
    const r = linkSchema.safeParse({ name: "Wi-Fi", type: "wifi", wifi_password: "123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsOf(r.error).wifi_ssid).toBeDefined();
    expect(linkSchema.parse({ name: "Site", type: "other", url: "site.com", wifi_ssid: "x" }).wifi_ssid).toBeNull();
  });

  it("interpreta is_active vindo de formulário", () => {
    expect(linkSchema.parse({ name: "Site", type: "other", url: "site.com", is_active: "false" }).is_active).toBe(false);
    expect(linkSchema.parse({ name: "Site", type: "other", url: "site.com", is_active: "on" }).is_active).toBe(true);
  });

  it("rejeita valor Pix inválido e tipo desconhecido", () => {
    expect(
      linkSchema.safeParse({ name: "Pix", type: "pix", pix_key: "52998224725", pix_name: "A", pix_city: "B", pix_amount: "-1" }).success,
    ).toBe(false);
    expect(linkSchema.safeParse({ name: "X", type: "foo", url: "a.com" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("valida e-mail e senha", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "123456" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a", password: "123456" }).success).toBe(false);
  });
});

describe("formDataToObject", () => {
  it("ignora campos internos de Server Actions", () => {
    const fd = new FormData();
    fd.set("name", "Padaria");
    fd.set("$ACTION_ID_abc", "");
    expect(formDataToObject(fd)).toEqual({ name: "Padaria" });
  });
});
