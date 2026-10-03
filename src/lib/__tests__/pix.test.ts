import { describe, expect, it } from "vitest";
import {
  buildPixPayload,
  crc16,
  emv,
  isValidCnpj,
  isValidCpf,
  normalizePixKey,
  sanitizePixText,
} from "@/lib/pix";

describe("crc16", () => {
  it("bate com o valor de verificação do CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("emv", () => {
  it("formata ID + tamanho com 2 dígitos + valor", () => {
    expect(emv("00", "01")).toBe("000201");
    expect(emv("59", "Fulano de Tal")).toBe("5913Fulano de Tal");
  });

  it("rejeita valores com mais de 99 bytes", () => {
    expect(() => emv("26", "x".repeat(100))).toThrow();
  });
});

describe("buildPixPayload", () => {
  it("reproduz o exemplo oficial do manual do BR Code (Banco Central)", () => {
    expect(
      buildPixPayload({
        key: "123e4567-e12b-12d1-a456-426655440000",
        merchantName: "Fulano de Tal",
        merchantCity: "BRASILIA",
      }),
    ).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    );
  });

  it("inclui valor, descrição e txid quando informados", () => {
    const payload = buildPixPayload({
      key: "contato@padaria.com.br",
      merchantName: "Padaria São João",
      merchantCity: "São Paulo",
      amount: 12.5,
      description: "Café",
      txid: "PEDIDO-42",
    });
    expect(payload).toContain("0122contato@padaria.com.br");
    expect(payload).toContain("0204Cafe");
    expect(payload).toContain("540512.50");
    expect(payload).toContain("5916Padaria Sao Joao");
    expect(payload).toContain("6009Sao Paulo");
    expect(payload).toContain("0508PEDIDO42");
    // CRC sempre confere com o restante do payload
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });

  it("trunca nome (25) e cidade (15) sem espaço final", () => {
    const payload = buildPixPayload({
      key: "52998224725",
      merchantName: "Nome Muito Comprido Para Caber No Campo",
      merchantCity: "Cidade Muito Comprida",
    });
    expect(payload).toContain("5924Nome Muito Comprido Para");
    expect(payload).toContain("6015Cidade Muito Co");
  });

  it("falha com chave inválida ou dados faltando", () => {
    expect(() => buildPixPayload({ key: "abc", merchantName: "A", merchantCity: "B" })).toThrow(
      "Chave Pix inválida",
    );
    expect(() =>
      buildPixPayload({ key: "52998224725", merchantName: "", merchantCity: "B" }),
    ).toThrow();
  });
});

describe("normalizePixKey", () => {
  it.each([
    ["529.982.247-25", { type: "cpf", key: "52998224725" }],
    ["11.222.333/0001-81", { type: "cnpj", key: "11222333000181" }],
    ["+55 (11) 99999-8888", { type: "phone", key: "+5511999998888" }],
    ["Contato@Loja.com", { type: "email", key: "contato@loja.com" }],
    ["123E4567-E12B-12D1-A456-426655440000", { type: "random", key: "123e4567-e12b-12d1-a456-426655440000" }],
  ])("%s", (input, expected) => {
    expect(normalizePixKey(input)).toEqual(expected);
  });

  it.each(["", "111.111.111-11", "12345678901", "+55 11", "nao-e-chave"])("rejeita %j", (input) => {
    expect(normalizePixKey(input)).toBeNull();
  });
});

describe("documentos", () => {
  it("valida CPF e CNPJ pelos dígitos verificadores", () => {
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("11222333000180")).toBe(false);
  });
});

describe("sanitizePixText", () => {
  it("remove acentos e caracteres especiais", () => {
    expect(sanitizePixText("  Açaí do Zé™  ", 25)).toBe("Acai do Ze");
  });
});
