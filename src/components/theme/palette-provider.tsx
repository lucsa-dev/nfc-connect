"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  DEFAULT_PALETTE,
  isPaletteId,
  PALETTE_STORAGE_KEY,
  type PaletteId,
} from "@/lib/themes";

interface PaletteContextValue {
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

function readPalette(): PaletteId {
  const current = document.documentElement.dataset.palette;
  return isPaletteId(current) ? current : DEFAULT_PALETTE;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
  return () => observer.disconnect();
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const palette = useSyncExternalStore(subscribe, readPalette, () => DEFAULT_PALETTE);

  const setPalette = useCallback((next: PaletteId) => {
    document.documentElement.dataset.palette = next;
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      // armazenamento indisponível (modo privado): vale só nesta sessão
    }
  }, []);

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>{children}</PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette deve ser usado dentro de <PaletteProvider>");
  return ctx;
}
