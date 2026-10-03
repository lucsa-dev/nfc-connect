import { describe, expect, it } from "vitest";
import {
  countBy,
  lastNDays,
  summarizeVisits,
  toLocalDate,
  topWithOthers,
  type VisitRow,
} from "@/lib/analytics";

function visit(overrides: Partial<VisitRow> = {}): VisitRow {
  return {
    created_at: "2026-10-02T15:00:00Z",
    source: "nfc",
    device_type: "mobile",
    os: "iOS",
    browser: "Safari",
    city: "São Paulo",
    ip_hash: "a",
    is_bot: false,
    ...overrides,
  };
}

describe("toLocalDate", () => {
  it("converte para o dia local de São Paulo", () => {
    // 01:30 UTC do dia 3 ainda é dia 2 em São Paulo (UTC-3)
    expect(toLocalDate(new Date("2026-10-03T01:30:00Z"))).toBe("2026-10-02");
    expect(toLocalDate(new Date("2026-10-03T03:30:00Z"))).toBe("2026-10-03");
  });
});

describe("lastNDays", () => {
  it("lista os dias em ordem crescente terminando hoje", () => {
    expect(lastNDays(3, new Date("2026-03-01T12:00:00Z"))).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
  });
});

describe("countBy / topWithOthers", () => {
  it("conta, ordena por frequência e agrupa nulos como Desconhecido", () => {
    const buckets = countBy(["a", "b", "a", null, "c", "a", "b"], (x) => x);
    expect(buckets).toEqual([
      { label: "a", count: 3 },
      { label: "b", count: 2 },
      { label: "c", count: 1 },
      { label: "Desconhecido", count: 1 },
    ]);
    expect(topWithOthers(buckets, 2)).toEqual([
      { label: "a", count: 3 },
      { label: "b", count: 2 },
      { label: "Outros", count: 2 },
    ]);
  });
});

describe("summarizeVisits", () => {
  const now = new Date("2026-10-03T12:00:00Z");

  it("consolida totais, únicos e quebras ignorando robôs", () => {
    const summary = summarizeVisits(
      [
        visit({ ip_hash: "a" }),
        visit({ ip_hash: "a", source: "qr" }),
        visit({ ip_hash: "b", device_type: "desktop", os: "Windows", browser: "Chrome" }),
        visit({ ip_hash: "c", is_bot: true, device_type: "bot" }),
      ],
      { now, days: 7 },
    );

    expect(summary.total).toBe(3);
    expect(summary.uniqueVisitors).toBe(2);
    expect(summary.bots).toBe(1);
    expect(summary.bySource).toEqual([
      { label: "NFC / direto", count: 2 },
      { label: "QR Code", count: 1 },
    ]);
    expect(summary.byDevice).toEqual([
      { label: "Celular", count: 2 },
      { label: "Computador", count: 1 },
    ]);
    expect(summary.byOs[0]).toEqual({ label: "iOS", count: 2 });
  });

  it("preenche a série diária com zeros e respeita a janela", () => {
    const summary = summarizeVisits(
      [
        visit({ created_at: "2026-10-03T10:00:00Z" }),
        visit({ created_at: "2026-10-03T11:00:00Z" }),
        visit({ created_at: "2026-10-01T10:00:00Z" }),
        visit({ created_at: "2026-09-01T10:00:00Z" }), // fora da janela
      ],
      { now, days: 3 },
    );
    expect(summary.daily).toEqual([
      { date: "2026-10-01", count: 1 },
      { date: "2026-10-02", count: 0 },
      { date: "2026-10-03", count: 2 },
    ]);
    expect(summary.total).toBe(4);
  });

  it("funciona sem acessos", () => {
    const summary = summarizeVisits([], { now, days: 2 });
    expect(summary.total).toBe(0);
    expect(summary.uniqueVisitors).toBe(0);
    expect(summary.daily).toHaveLength(2);
  });
});

import { parsePeriod, periodStart } from "@/lib/periods";

describe("parsePeriod / periodStart", () => {
  it("aceita apenas os períodos suportados", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod(["90"])).toBe(90);
    expect(parsePeriod("15")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });

  it("calcula o início da janela", () => {
    expect(periodStart(7, new Date("2026-10-10T12:00:00Z")).toISOString()).toBe("2026-10-03T12:00:00.000Z");
  });
});
