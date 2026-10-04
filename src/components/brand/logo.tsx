import { cn } from "cn";

/** Cores oficiais da marca TopTap. */
export const BRAND = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
  gray: "#3C4043",
} as const;

const STAR_POINTS =
  "0,-12 2.94,-4.05 11.41,-3.71 4.76,1.55 7.05,9.71 0,5 -7.05,9.71 -4.76,1.55 -11.41,-3.71 -2.94,-4.05";

/** Ondas NFC da marca (desenhadas num quadro de 0..160 × 40..200). */
export function NfcWaves({ strokeWidth = 14 }: { strokeWidth?: number }) {
  return (
    <g fill="none" strokeWidth={strokeWidth} strokeLinecap="round">
      <circle cx="80" cy="120" r="12" fill={BRAND.green} stroke="none" />
      <path d="M101.86 93.96 A34 34 0 0 1 101.86 146.04" stroke={BRAND.yellow} />
      <path d="M116 77.1 A56 56 0 0 1 116 162.9" stroke={BRAND.red} />
      <path d="M130.15 60.25 A78 78 0 0 1 130.15 179.75" stroke={BRAND.blue} />
    </g>
  );
}

/** Fileira de estrelas; cada estrela tem ~23 unidades, espaçadas por `gap`. */
export function Stars({ count = 5, gap = 34, color = BRAND.yellow }: { count?: number; gap?: number; color?: string }) {
  return (
    <g fill={color} stroke={color} strokeWidth={2.5} strokeLinejoin="round">
      {Array.from({ length: count }, (_, i) => (
        <polygon key={i} points={STAR_POINTS} transform={`translate(${i * gap} 0)`} />
      ))}
    </g>
  );
}

/** Ícone da marca (ondas NFC). */
export function LogoIcon({ className, title = "TopTap" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="58 50 92 140" className={cn("h-8 w-auto", className)} role="img" aria-label={title}>
      <NfcWaves />
    </svg>
  );
}

/**
 * Logo completa. "Top" usa a cor do texto (funciona no modo escuro);
 * "Tap" usa o azul da marca.
 */
export function Logo({ className, withStars = false }: { className?: string; withStars?: boolean }) {
  return (
    <svg
      viewBox={withStars ? "60 48 500 172" : "60 48 500 144"}
      className={cn("h-8 w-auto", className)}
      role="img"
      aria-label="TopTap"
    >
      <NfcWaves />
      <text
        x="180"
        y="138"
        className="font-heading"
        style={{ fontWeight: 600, fontSize: 96, letterSpacing: -2 }}
      >
        <tspan className="fill-foreground">Top</tspan>
        <tspan fill={BRAND.blue}>Tap</tspan>
      </text>
      {withStars && (
        <g transform="translate(231 188) scale(1.9)">
          <Stars />
        </g>
      )}
    </svg>
  );
}
