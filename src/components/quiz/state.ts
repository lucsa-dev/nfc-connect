import type { StyleId } from "@/lib/card";
import type { PlaceInfo } from "@/lib/places";
import { goalOptions, type ClientBandId, type QuizAnswers, type SpotId } from "@/lib/quiz";

export const STEPS = [
  "negocio",
  "como-funciona",
  "meta",
  "onde-paga",
  "clientes",
  "pontos",
  "calculando",
  "plano",
  "contato",
  "pronto",
] as const;
export type StepKey = (typeof STEPS)[number];

export interface QuizState extends QuizAnswers {
  step: number;
  sessionId: string;
  /** Token de sessão do Google Places (agrupa busca + detalhes na cobrança). */
  placesToken: string;
  contact: { name: string; whatsapp: string; consent: boolean };
  utm: Record<string, string>;
}

export type Action =
  | { type: "next" }
  | { type: "back" }
  | { type: "business"; business: PlaceInfo | null }
  | { type: "goal"; goal: number }
  | { type: "toggleSpot"; spot: SpotId }
  | { type: "clients"; clients: ClientBandId }
  | { type: "counters"; value: number }
  | { type: "tables"; value: number }
  | { type: "style"; style: StyleId }
  | { type: "contact"; contact: Partial<QuizState["contact"]> }
  | { type: "reset" };

export const STORAGE_KEY = "toptap-quiz-v1";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export function initialState(search = ""): QuizState {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 200);
  }
  return {
    step: 0,
    sessionId: crypto.randomUUID(),
    placesToken: crypto.randomUUID(),
    business: null,
    goal: null,
    // Opções já marcadas: o caso mais comum avança com 1 toque.
    spots: ["balcao"],
    clients: "11_50",
    counters: 1,
    tables: 4,
    style: "classico",
    contact: { name: "", whatsapp: "", consent: false },
    utm,
  };
}

/** Retoma um quiz salvo; UTM novas da URL têm prioridade. */
export function loadState(search: string): QuizState {
  const fresh = initialState(search);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as QuizState | null;
    if (!saved || typeof saved.step !== "number" || !saved.sessionId) return fresh;
    // Quem já concluiu começa um pedido novo.
    if (STEPS[saved.step] === "pronto") return fresh;
    // A tela de cálculo não faz sentido ao voltar: retoma no plano.
    const step = STEPS[saved.step] === "calculando" ? STEPS.indexOf("plano") : saved.step;
    return { ...fresh, ...saved, step, utm: Object.keys(fresh.utm).length ? fresh.utm : saved.utm };
  } catch {
    return fresh;
  }
}

export function persist(state: QuizState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // modo privado: segue sem salvar
  }
}

export function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case "next": {
      const step = Math.min(state.step + 1, STEPS.length - 1);
      // Ao chegar na meta, já deixa a opção do meio marcada.
      if (STEPS[step] === "meta" && state.goal === null) {
        const options = goalOptions(state.business?.reviews);
        return { ...state, step, goal: options[Math.min(1, options.length - 1)]! };
      }
      return { ...state, step };
    }
    case "back": {
      let step = Math.max(0, state.step - 1);
      if (STEPS[step] === "calculando") step -= 1; // não repete o cálculo ao voltar
      return { ...state, step };
    }
    case "business":
      // Trocar de negócio zera a meta (as opções dependem do total atual).
      return { ...state, business: action.business, goal: null, placesToken: action.business ? state.placesToken : crypto.randomUUID() };
    case "goal":
      return { ...state, goal: action.goal };
    case "toggleSpot": {
      const has = state.spots.includes(action.spot);
      return { ...state, spots: has ? state.spots.filter((s) => s !== action.spot) : [...state.spots, action.spot] };
    }
    case "clients":
      return { ...state, clients: action.clients };
    case "counters":
      return { ...state, counters: Math.min(20, Math.max(1, action.value)) };
    case "tables":
      return { ...state, tables: Math.min(200, Math.max(1, action.value)) };
    case "style":
      return { ...state, style: action.style };
    case "contact":
      return { ...state, contact: { ...state.contact, ...action.contact } };
    case "reset":
      return initialState();
  }
}
