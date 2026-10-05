import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco simulado: guarda o último upsert e o status já existente.
const db = vi.hoisted(() => ({ existing: null as null | { status: string }, upserts: [] as Record<string, unknown>[] }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.existing }) }) }),
      upsert: async (row: Record<string, unknown>) => {
        db.upserts.push(row);
        return { error: null };
      },
    }),
  }),
}));

const { saveLead } = await import("@/app/comecar/actions");

const base = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  step: "plano",
  business: {
    placeId: "ChIJ1",
    name: "Padaria Central",
    address: "Rua A",
    city: "Fortaleza",
    state: "CE",
    rating: 4.6,
    reviews: 56,
    category: "Padaria",
    mapsUrl: "https://maps.google.com/?cid=1",
    businessStatus: "OPERATIONAL",
    lastReviewAt: "2026-09-20T10:00:00Z",
  },
  goal: 120,
  spots: ["balcao", "mesas"],
  clients: "51_100",
  counters: 2,
  tables: 6,
  style: "escuro",
  contact: null,
  utm: { utm_source: "instagram" },
};

describe("saveLead", () => {
  beforeEach(() => {
    db.existing = null;
    db.upserts = [];
  });

  it("recalcula kit, valor e prazo no servidor", async () => {
    expect(await saveLead(base)).toEqual({ ok: true });
    expect(db.upserts[0]).toMatchObject({
      session_id: base.sessionId,
      status: "quiz",
      place_id: "ChIJ1",
      plaques: 2,
      cards: 6,
      total_cents: 16000,
      estimate: "3 a 4 meses",
      utm: { utm_source: "instagram" },
    });
  });

  it("vira lead ao receber o WhatsApp, normalizado", async () => {
    await saveLead({ ...base, step: "pronto", contact: { name: "Ana", whatsapp: "(85) 99999-8888", consent: true } });
    expect(db.upserts[0]).toMatchObject({ status: "lead", contact_name: "Ana", whatsapp: "+5585999998888", marketing_consent: true });
  });

  it("rejeita WhatsApp inválido e dados fora do formato", async () => {
    expect(await saveLead({ ...base, contact: { name: "Ana", whatsapp: "123", consent: false } })).toEqual({ ok: false, error: "WhatsApp inválido" });
    expect((await saveLead({ ...base, sessionId: "x" })).ok).toBe(false);
    expect((await saveLead({ ...base, spots: ["hack"] })).ok).toBe(false);
    expect((await saveLead({ ...base, counters: 9999 })).ok).toBe(false);
    expect(db.upserts).toHaveLength(0);
  });

  it("não mexe em pedidos já tratados no painel", async () => {
    db.existing = { status: "convertido" };
    expect(await saveLead(base)).toEqual({ ok: true });
    expect(db.upserts).toHaveLength(0);
  });

  it("mantém o status de lead em atualizações sem contato", async () => {
    db.existing = { status: "lead" };
    await saveLead(base);
    expect(db.upserts[0]).toMatchObject({ status: "lead" });
    // sem contato no envio: não sobrescreve nome/WhatsApp já salvos
    expect(db.upserts[0]).not.toHaveProperty("whatsapp");
    expect(db.upserts[0]).not.toHaveProperty("contact_name");
  });
});
