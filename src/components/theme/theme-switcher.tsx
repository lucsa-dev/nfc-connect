"use client";

import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/theme/palette-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPaletteId, PALETTES } from "@/lib/themes";

const MODES = [
  { id: "light", label: "Claro", icon: SunIcon },
  { id: "dark", label: "Escuro", icon: MoonIcon },
  { id: "system", label: "Sistema", icon: MonitorIcon },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Alterar tema" />}
      >
        <PaletteIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Modo</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(String(v))}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={id} value={id}>
                <Icon />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Cor</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={palette}
            onValueChange={(v) => isPaletteId(v) && setPalette(v)}
          >
            {PALETTES.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                <span
                  aria-hidden
                  className="size-3.5 rounded-full ring-1 ring-foreground/15"
                  style={{ background: p.swatch }}
                />
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
