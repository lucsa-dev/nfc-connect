import { describe, expect, it } from "vitest";
import { businessSlugCandidates, leadDescription } from "@/lib/leads";

describe("businessSlugCandidates", () => {
  it("tenta o nome, depois nome + cidade, depois sufixos", () => {
    expect(businessSlugCandidates("Padaria Central", "Fortaleza")).toEqual([
      "padaria-central",
      "padaria-central-fortaleza",
      "padaria-central-2",
      "padaria-central-3",
      "padaria-central-4",
      "padaria-central-5",
    ]);
  });

  it("descarta slugs reservados ou inválidos", () => {
    expect(businessSlugCandidates("Dashboard", null)).toEqual(["dashboard-2", "dashboard-3", "dashboard-4", "dashboard-5"]);
    expect(businessSlugCandidates("!!", null)).toEqual([]);
  });
});

describe("leadDescription", () => {
  it("resume contato, endereço e pedido", () => {
    const text = leadDescription({
      contact_name: "Ana",
      whatsapp: "+5585999998888",
      place_address: "Rua A, 1",
      plaques: 2,
      cards: 1,
      total_cents: 16000,
      style: "classico",
    });
    expect(text).toContain("Contato: Ana · +5585999998888");
    expect(text).toContain("Endereço: Rua A, 1");
    expect(text).toMatch(/Pedido \(quiz\): 2 placas \+ 1 cartão, estilo classico · R\$\s?160,00/);
  });
});
