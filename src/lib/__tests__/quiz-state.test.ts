import { beforeEach, describe, expect, it } from "vitest";
import { initialState, loadState, reducer, STEPS, STORAGE_KEY } from "@/components/quiz/state";

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const idx = (key: (typeof STEPS)[number]) => STEPS.indexOf(key);

describe("quiz: estado", () => {
  beforeEach(() => store.clear());

  it("captura UTM da URL", () => {
    expect(initialState("?utm_source=instagram&x=1&gclid=abc").utm).toEqual({ utm_source: "instagram", gclid: "abc" });
  });

  it("avança e volta sem repetir o cálculo", () => {
    let s = { ...initialState(), step: idx("plano") };
    s = reducer(s, { type: "back" });
    expect(STEPS[s.step]).toBe("pontos");
    s = reducer({ ...s, step: 0 }, { type: "back" });
    expect(s.step).toBe(0);
    s = reducer({ ...s, step: STEPS.length - 1 }, { type: "next" });
    expect(s.step).toBe(STEPS.length - 1);
  });

  it("trocar de negócio zera a meta", () => {
    const s = reducer({ ...initialState(), goal: 250 }, { type: "business", business: null });
    expect(s.goal).toBeNull();
  });

  it("alterna locais e limita quantidades", () => {
    let s = reducer(initialState(), { type: "toggleSpot", spot: "mesas" });
    expect(s.spots).toEqual(["balcao", "mesas"]);
    s = reducer(s, { type: "toggleSpot", spot: "balcao" });
    expect(s.spots).toEqual(["mesas"]);
    expect(reducer(s, { type: "counters", value: 99 }).counters).toBe(20);
    expect(reducer(s, { type: "tables", value: 0 }).tables).toBe(1);
  });

  it("retoma o quiz salvo, mas reinicia quem já concluiu", () => {
    const saved = { ...initialState(), step: idx("calculando"), goal: 100 };
    store.set(STORAGE_KEY, JSON.stringify(saved));
    const loaded = loadState("");
    expect(loaded.sessionId).toBe(saved.sessionId);
    expect(STEPS[loaded.step]).toBe("plano");
    expect(loaded.goal).toBe(100);

    store.set(STORAGE_KEY, JSON.stringify({ ...saved, step: idx("pronto") }));
    expect(loadState("").sessionId).not.toBe(saved.sessionId);

    store.set(STORAGE_KEY, "{quebrado");
    expect(loadState("").step).toBe(0);
  });
});

describe("quiz: meta pré-selecionada", () => {
  it("marca a opção do meio ao entrar na pergunta da meta", () => {
    const s = reducer({ ...initialState(), step: STEPS.indexOf("meta") - 1 }, { type: "next" });
    expect(STEPS[s.step]).toBe("meta");
    expect(s.goal).toBe(100); // [50, 100, 250] sem avaliações
  });
});
