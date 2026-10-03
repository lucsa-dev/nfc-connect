/**
 * Paletas de cor disponíveis. Para criar uma nova:
 * 1. adicione um bloco [data-palette="id"] (claro e escuro) em src/app/themes.css;
 * 2. registre-a aqui.
 */
export const PALETTES = [
  { id: "neutral", label: "Neutro", swatch: "oklch(0.205 0 0)" },
  { id: "blue", label: "Azul", swatch: "oklch(0.546 0.245 262.881)" },
  { id: "green", label: "Verde", swatch: "oklch(0.596 0.145 163.225)" },
  { id: "violet", label: "Violeta", swatch: "oklch(0.541 0.281 293.009)" },
  { id: "orange", label: "Laranja", swatch: "oklch(0.646 0.222 41.116)" },
  { id: "rose", label: "Rosa", swatch: "oklch(0.586 0.253 17.585)" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "blue";
export const PALETTE_STORAGE_KEY = "nfc-connect-palette";

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((p) => p.id === value);
}

/** Script inline que aplica a paleta antes da primeira pintura (sem flash). */
export const paletteInitScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  PALETTE_STORAGE_KEY,
)});var ok=${JSON.stringify(PALETTES.map((p) => p.id))};document.documentElement.dataset.palette=ok.indexOf(p)>=0?p:${JSON.stringify(
  DEFAULT_PALETTE,
)};}catch(e){document.documentElement.dataset.palette=${JSON.stringify(DEFAULT_PALETTE)};}})();`;
