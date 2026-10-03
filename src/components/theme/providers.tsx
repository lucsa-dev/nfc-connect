"use client";

import { ThemeProvider } from "next-themes";
import { PaletteProvider } from "@/components/theme/palette-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PaletteProvider>
        {children}
        <Toaster richColors position="top-center" />
      </PaletteProvider>
    </ThemeProvider>
  );
}
