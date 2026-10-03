import { describe, expect, it } from "vitest";
import { escapeCsvValue, toCsv } from "@/lib/csv";

describe("escapeCsvValue", () => {
  it("escapa aspas, vírgulas e quebras de linha", () => {
    expect(escapeCsvValue('Diz "oi", tchau')).toBe('"Diz ""oi"", tchau"');
    expect(escapeCsvValue("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("neutraliza fórmulas de planilha", () => {
    expect(escapeCsvValue("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(escapeCsvValue("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("não altera números negativos e trata nulos", () => {
    expect(escapeCsvValue(-23.5)).toBe("-23.5");
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(undefined)).toBe("");
    expect(escapeCsvValue(true)).toBe("true");
  });
});

describe("toCsv", () => {
  it("gera cabeçalho e linhas na ordem das colunas", () => {
    const csv = toCsv(
      [
        { a: 1, b: "x", c: "ignorado" },
        { a: 2, b: null, c: "" },
      ],
      ["b", "a"],
    );
    expect(csv).toBe("b,a\r\nx,1\r\n,2\r\n");
  });
});
