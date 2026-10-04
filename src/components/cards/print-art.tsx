import { BRAND, NfcWaves, Stars } from "@/components/brand/logo";
import {
  balanceLines,
  CARD,
  fitFontSize,
  getProduct,
  productSize,
  type CardCopy,
  type ProductId,
  type Side,
  type StyleId,
} from "@/lib/card";

/**
 * Arte das placas e cartões em SVG, com medidas em milímetros (origem no corte).
 * Componente puro: serve para pré-visualização e para impressão.
 */

export interface ArtData {
  /**
   * Nome do negócio, só para peças personalizadas (lotes grandes).
   * Sem nome, a arte é a padrão TopTap: a logo ocupa o lugar do nome.
   */
  businessName?: string | null;
  copy: CardCopy;
  qr: { size: number; d: string };
  url: string;
}

interface Theme {
  background: string;
  text: string;
  muted: string;
  accent: string;
  /** Fundo da área de toque do NFC */
  zone: string;
  wavesMono?: string;
  colorBar: boolean;
}

const THEMES: Record<StyleId, Theme> = {
  classico: { background: "#FFFFFF", text: "#202124", muted: "#5F6368", accent: "#1A73E8", zone: "#E8F0FE", colorBar: true },
  escuro: { background: "#202124", text: "#FFFFFF", muted: "#BDC1C6", accent: "#8AB4F8", zone: "#303134", colorBar: true },
  azul: { background: "#1A73E8", text: "#FFFFFF", muted: "#D2E3FC", accent: "#FFFFFF", zone: "#3F8AF0", wavesMono: "#FFFFFF", colorBar: false },
};

const FONT = "var(--font-poppins), 'Poppins', Arial, sans-serif";
const B = CARD.bleed;
const LINE = 1.15;

interface LayoutProps {
  data: ArtData;
  t: Theme;
  w: number;
  h: number;
}

// Peças -----------------------------------------------------------------------

/** Ondas NFC com altura `h` mm, canto superior esquerdo em (x, y). Largura ≈ 0,66 × h. */
function Waves({ x, y, h, mono }: { x: number; y: number; h: number; mono?: string }) {
  const k = h / 140;
  return (
    <g transform={`translate(${x - 58 * k} ${y - 50 * k}) scale(${k})`}>
      {mono ? (
        <g fill="none" strokeWidth={14} strokeLinecap="round" stroke={mono}>
          <circle cx="80" cy="120" r="12" fill={mono} stroke="none" />
          <path d="M101.86 93.96 A34 34 0 0 1 101.86 146.04" />
          <path d="M116 77.1 A56 56 0 0 1 116 162.9" opacity={0.85} />
          <path d="M130.15 60.25 A78 78 0 0 1 130.15 179.75" opacity={0.7} />
        </g>
      ) : (
        <NfcWaves />
      )}
    </g>
  );
}

const wavesWidth = (h: number) => (h * 92) / 140;

/** 5 estrelas com largura total `w` mm, centro vertical em y. */
function StarRow({ x, y, w, center = false }: { x: number; y: number; w: number; center?: boolean }) {
  const k = w / 159; // 4 × 34 + 23 unidades
  const left = center ? x - w / 2 : x;
  return (
    <g transform={`translate(${left + 11.5 * k} ${y}) scale(${k})`}>
      <Stars />
    </g>
  );
}

/** Faixa com as 4 cores da marca no rodapé (entra na sangria). */
function ColorBar({ w, h, height = 1.6 }: { w: number; h: number; height?: number }) {
  const colors = [BRAND.blue, BRAND.red, BRAND.yellow, BRAND.green];
  const seg = (w + 2 * B) / colors.length;
  return (
    <g>
      {colors.map((c, i) => (
        <rect key={c} x={-B + i * seg} y={h - height} width={seg + 0.05} height={height + B} fill={c} />
      ))}
    </g>
  );
}

/** QR Code com zona de silêncio branca; `size` mm inclui a margem. */
function Qr({ x, y, size, qr }: { x: number; y: number; size: number; qr: ArtData["qr"] }) {
  const quiet = 2; // módulos de margem
  const k = size / (qr.size + quiet * 2);
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={Math.min(2.5, size * 0.05)} fill="#FFFFFF" />
      <path transform={`translate(${x + quiet * k} ${y + quiet * k}) scale(${k})`} d={qr.d} fill="#000000" />
    </g>
  );
}

function Text({
  x,
  y,
  size,
  color,
  weight = 600,
  anchor = "start",
  children,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} textAnchor={anchor} style={{ fontFamily: FONT }}>
      {children}
    </text>
  );
}

/** Título em 1 linha se couber num tamanho bom; senão em 2 linhas equilibradas. */
function headlineLines(text: string, maxWidth: number, { max, min }: { max: number; min: number }) {
  const single = fitFontSize(text, maxWidth, { max, min });
  if (single >= max * 0.8) return { lines: [text], size: single };
  const lines = balanceLines(text);
  const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
  return { lines: [...lines], size: fitFontSize(longest, maxWidth, { max, min }) };
}

/**
 * Logo TopTap (ondas + nome) com altura `h` mm. A logo original ocupa
 * 500 × 144 unidades; `anchor` define se x é o início ou o centro.
 */
function BrandLogo({ x, y, h, t, anchor = "start" }: { x: number; y: number; h: number; t: Theme; anchor?: "start" | "middle" }) {
  const k = h / 144;
  const left = anchor === "middle" ? x - (500 * k) / 2 : x;
  const tap = t.wavesMono ?? BRAND.blue;
  return (
    <g transform={`translate(${left - 60 * k} ${y - 48 * k}) scale(${k})`} aria-label="TopTap">
      {t.wavesMono ? (
        <g fill="none" strokeWidth={14} strokeLinecap="round" stroke={t.wavesMono}>
          <circle cx="80" cy="120" r="12" fill={t.wavesMono} stroke="none" />
          <path d="M101.86 93.96 A34 34 0 0 1 101.86 146.04" />
          <path d="M116 77.1 A56 56 0 0 1 116 162.9" opacity={0.85} />
          <path d="M130.15 60.25 A78 78 0 0 1 130.15 179.75" opacity={0.7} />
        </g>
      ) : (
        <NfcWaves />
      )}
      <text x={180} y={138} fontSize={96} fontWeight={600} letterSpacing={-2} style={{ fontFamily: FONT }}>
        <tspan fill={t.text}>Top</tspan>
        <tspan fill={tap}>Tap</tspan>
      </text>
    </g>
  );
}

/** Nome do negócio (personalizado) ou logo TopTap (padrão), no mesmo lugar. */
function Identity({
  data,
  t,
  x,
  baseline,
  maxWidth,
  maxSize,
  minSize,
  logoHeight,
  anchor = "start",
}: {
  data: ArtData;
  t: Theme;
  x: number;
  baseline: number;
  maxWidth: number;
  maxSize: number;
  minSize: number;
  logoHeight: number;
  anchor?: "start" | "middle";
}) {
  if (data.businessName) {
    return (
      <Text x={x} y={baseline} size={fitFontSize(data.businessName, maxWidth, { max: maxSize, min: minSize })} color={t.accent} anchor={anchor}>
        {data.businessName}
      </Text>
    );
  }
  // Centro da logo = centro visual do texto (≈ 0,35 em acima da linha de base).
  return <BrandLogo x={x} y={baseline - maxSize * 0.35 - logoHeight / 2} h={logoHeight} t={t} anchor={anchor} />;
}

function BrandMark({ x, y, color, anchor = "end" }: { x: number; y: number; color: string; anchor?: "end" | "middle" }) {
  return (
    <Text x={x} y={y} size={1.9} color={color} weight={500} anchor={anchor}>
      feito com TopTap
    </Text>
  );
}

// Placas (só frente) -------------------------------------------------------------

function PlaqueSquare({ data, t, w, h }: LayoutProps) {
  const cx = w / 2;
  const pad = 8;
  const inner = w - 2 * pad;
  const { lines, size } = headlineLines(data.copy.headline, inner, { max: 7.6, min: 5 });
  const top = 15;
  const headline = lines.map((line, i) => (
    <Text key={line} x={cx} y={top + i * size * LINE} size={size} color={t.text} anchor="middle">
      {line}
    </Text>
  ));
  const sublineY = top + lines.length * size * LINE + 0.5;
  const starsY = sublineY + 7.5;

  const boxY = starsY + 7;
  const box = 38;
  const gap = inner - 2 * box;
  const nfcX = pad;
  const qrX = pad + box + gap;
  const labelY = boxY + box + 6;
  const wavesH = 22;

  return (
    <>
      {headline}
      <Text x={cx} y={sublineY} size={3.6} color={t.muted} weight={500} anchor="middle">
        {data.copy.subline}
      </Text>
      <StarRow x={cx} y={starsY} w={44} center />

      {/* Área de toque: o chip NFC fica colado atrás deste quadro */}
      <rect x={nfcX} y={boxY} width={box} height={box} rx={4} fill={t.zone} />
      <Waves x={nfcX + (box - wavesWidth(wavesH)) / 2 + 1.5} y={boxY + (box - wavesH) / 2} h={wavesH} mono={t.wavesMono} />
      <Qr x={qrX} y={boxY} size={box} qr={data.qr} />

      <Text x={nfcX + box / 2} y={labelY} size={fitFontSize(data.copy.cta, box + 4, { max: 3.4, min: 2.4 })} color={t.text} anchor="middle">
        {data.copy.cta}
      </Text>
      <Text x={qrX + box / 2} y={labelY} size={fitFontSize(data.copy.back, box + 4, { max: 3.4, min: 2.4 })} color={t.text} anchor="middle">
        {data.copy.back}
      </Text>

      <Identity data={data} t={t} x={cx} baseline={h - 8} maxWidth={inner} maxSize={5} minSize={3.2} logoHeight={8} anchor="middle" />
      {data.businessName && <BrandMark x={w - CARD.safe - 1} y={h - 3.6} color={t.muted} />}
      {t.colorBar && <ColorBar w={w} h={h} height={2} />}
    </>
  );
}

function PlaqueTall({ data, t, w, h }: LayoutProps) {
  const cx = w / 2;
  const pad = 8;
  const inner = w - 2 * pad;
  const nameY = 15;
  const top = nameY + 11;

  const { lines, size } = headlineLines(data.copy.headline, inner, { max: 8.4, min: 5.4 });
  const headline = lines.map((line, i) => (
    <Text key={line} x={cx} y={top + i * size * LINE} size={size} color={t.text} anchor="middle">
      {line}
    </Text>
  ));
  const sublineY = top + lines.length * size * LINE + 0.5;
  const starsY = sublineY + 8;

  const qrSize = 54;
  const qrY = starsY + 7.5;
  const labelY = qrY + qrSize + 6;

  const pillW = inner - 6;
  const pillH = 17;
  const pillX = cx - pillW / 2;
  const pillY = labelY + 4.5;
  const wavesH = 12;
  const textX = pillX + 7 + wavesWidth(wavesH) + 4;

  return (
    <>
      <Identity data={data} t={t} x={cx} baseline={nameY} maxWidth={inner} maxSize={5} minSize={3.2} logoHeight={9} anchor="middle" />
      {headline}
      <Text x={cx} y={sublineY} size={3.8} color={t.muted} weight={500} anchor="middle">
        {data.copy.subline}
      </Text>
      <StarRow x={cx} y={starsY} w={52} center />

      <Qr x={cx - qrSize / 2} y={qrY} size={qrSize} qr={data.qr} />
      <Text x={cx} y={labelY} size={3.6} color={t.text} anchor="middle">
        {data.copy.back}
      </Text>

      {/* Área de toque: o chip NFC fica colado atrás desta faixa */}
      <rect x={pillX} y={pillY} width={pillW} height={pillH} rx={pillH / 2} fill={t.zone} />
      <Waves x={pillX + 7} y={pillY + (pillH - wavesH) / 2} h={wavesH} mono={t.wavesMono} />
      <Text x={textX} y={pillY + pillH / 2 + 1.3} size={fitFontSize(data.copy.cta, pillX + pillW - textX - 4, { max: 3.8, min: 2.6 })} color={t.text}>
        {data.copy.cta}
      </Text>

      {data.businessName && <BrandMark x={cx} y={h - 4.5} color={t.muted} anchor="middle" />}
      {t.colorBar && <ColorBar w={w} h={h} height={2} />}
    </>
  );
}

// Cartões (frente e verso) -------------------------------------------------------

function CardFront({ data, t, w, h }: LayoutProps) {
  const colX = 30;
  const colW = w - colX - CARD.safe - 1;
  const [l1, l2] = balanceLines(data.copy.headline);
  const size = fitFontSize(l2 && l2.length > l1.length ? l2 : l1, colW, { max: 5.4, min: 3.4 });
  const afterHeadline = l2 ? 14.5 + size * LINE : 14.5;
  return (
    <>
      <Waves x={6.5} y={11} h={25} mono={t.wavesMono} />
      <Text x={5.5} y={45} size={2.3} color={t.muted} weight={500}>
        {data.copy.cta}
      </Text>
      <Text x={colX} y={14.5} size={size} color={t.text}>
        {l1}
      </Text>
      {l2 && (
        <Text x={colX} y={14.5 + size * LINE} size={size} color={t.text}>
          {l2}
        </Text>
      )}
      <Text x={colX} y={afterHeadline + 5} size={2.6} color={t.muted} weight={500}>
        {data.copy.subline}
      </Text>
      <StarRow x={colX} y={afterHeadline + 11} w={30} />
      <Identity data={data} t={t} x={colX} baseline={45} maxWidth={colW} maxSize={3.6} minSize={2.2} logoHeight={6} />
      {t.colorBar && <ColorBar w={w} h={h} />}
    </>
  );
}

function CardBack({ data, t, w, h }: LayoutProps) {
  const qrSize = 38;
  const qrY = (h - qrSize) / 2 - (t.colorBar ? 0.8 : 0);
  const colX = CARD.safe + 3 + qrSize + 5;
  const colW = w - colX - CARD.safe;
  const [l1, l2] = balanceLines(data.copy.back);
  const size = fitFontSize(l2 && l2.length > l1.length ? l2 : l1, colW, { max: 4.4, min: 2.8 });
  return (
    <>
      <Qr x={CARD.safe + 3} y={qrY} size={qrSize} qr={data.qr} />
      <Text x={colX} y={17} size={size} color={t.text}>
        {l1}
      </Text>
      {l2 && (
        <Text x={colX} y={17 + size * LINE} size={size} color={t.text}>
          {l2}
        </Text>
      )}
      <StarRow x={colX} y={17 + size * (l2 ? LINE : 0) + 6.5} w={24} />
      <Text x={colX} y={38} size={fitFontSize(data.url, colW, { max: 2, min: 1.3, charWidth: 0.55 })} color={t.muted} weight={500}>
        {data.url}
      </Text>
      {data.businessName && <BrandMark x={w - CARD.safe} y={h - 5.5} color={t.muted} />}
      {t.colorBar && <ColorBar w={w} h={h} />}
    </>
  );
}

function CardVerticalFront({ data, t, w, h }: LayoutProps) {
  const cx = w / 2;
  const maxW = w - 2 * CARD.safe - 3;
  const [l1, l2] = balanceLines(data.copy.headline);
  const size = fitFontSize(l2 && l2.length > l1.length ? l2 : l1, maxW, { max: 5, min: 3.2 });
  const wavesH = 24;
  const afterHeadline = l2 ? 52 + size * LINE : 52;
  return (
    <>
      <Waves x={cx - wavesWidth(wavesH) / 2 + 2} y={8} h={wavesH} mono={t.wavesMono} />
      <StarRow x={cx} y={41} w={34} center />
      <Text x={cx} y={52} size={size} color={t.text} anchor="middle">
        {l1}
      </Text>
      {l2 && (
        <Text x={cx} y={52 + size * LINE} size={size} color={t.text} anchor="middle">
          {l2}
        </Text>
      )}
      <Text x={cx} y={afterHeadline + 5.5} size={2.6} color={t.muted} weight={500} anchor="middle">
        {data.copy.subline}
      </Text>
      <Identity data={data} t={t} x={cx} baseline={h - 11} maxWidth={maxW} maxSize={3.6} minSize={2.2} logoHeight={6} anchor="middle" />
      <Text x={cx} y={h - 6} size={2.2} color={t.muted} weight={500} anchor="middle">
        {data.copy.cta}
      </Text>
      {t.colorBar && <ColorBar w={w} h={h} />}
    </>
  );
}

function CardVerticalBack({ data, t, w, h }: LayoutProps) {
  const cx = w / 2;
  const qrSize = 40;
  const maxW = w - 2 * CARD.safe - 3;
  const [l1, l2] = balanceLines(data.copy.back);
  const size = fitFontSize(l2 && l2.length > l1.length ? l2 : l1, maxW, { max: 4.6, min: 3 });
  return (
    <>
      <Qr x={cx - qrSize / 2} y={10} size={qrSize} qr={data.qr} />
      <Text x={cx} y={60} size={size} color={t.text} anchor="middle">
        {l1}
      </Text>
      {l2 && (
        <Text x={cx} y={60 + size * LINE} size={size} color={t.text} anchor="middle">
          {l2}
        </Text>
      )}
      <Text x={cx} y={h - 11} size={fitFontSize(data.url, maxW, { max: 2, min: 1.3, charWidth: 0.55 })} color={t.muted} weight={500} anchor="middle">
        {data.url}
      </Text>
      {data.businessName && <BrandMark x={cx} y={h - 6} color={t.muted} anchor="middle" />}
      {t.colorBar && <ColorBar w={w} h={h} />}
    </>
  );
}

const LAYOUTS: Record<ProductId, Partial<Record<Side, (p: LayoutProps) => React.ReactNode>>> = {
  "placa-quadrada": { front: PlaqueSquare },
  "placa-retangular": { front: PlaqueTall },
  cartao: { front: CardFront, back: CardBack },
  "cartao-vertical": { front: CardVerticalFront, back: CardVerticalBack },
};

// Componentes públicos -----------------------------------------------------------

export function PrintArt({
  product: productId,
  style,
  side = "front",
  data,
  bleed = false,
  className,
}: {
  product: ProductId;
  style: StyleId;
  side?: Side;
  data: ArtData;
  /** true: inclui a sangria (para gráfica). false: só a área final. */
  bleed?: boolean;
  className?: string;
}) {
  const product = getProduct(productId);
  const { width: w, height: h, fullWidth, fullHeight } = productSize(product);
  const t = THEMES[style];
  const Layout = LAYOUTS[product.id][side] ?? LAYOUTS[product.id].front!;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={bleed ? `${-B} ${-B} ${fullWidth} ${fullHeight}` : `0 0 ${w} ${h}`}
      width={bleed ? `${fullWidth}mm` : undefined}
      height={bleed ? `${fullHeight}mm` : undefined}
      className={className}
      role="img"
      aria-label={`${product.label}${product.sides.length > 1 ? (side === "front" ? ", frente" : ", verso") : ""}: ${data.copy.headline}`}
    >
      <rect x={-B} y={-B} width={fullWidth} height={fullHeight} fill={t.background} />
      <Layout data={data} t={t} w={w} h={h} />
    </svg>
  );
}

/** Pré-visualização com cantos arredondados e sombra, como a peça física. */
export function ArtPreview({
  product: productId,
  style,
  side = "front",
  data,
  className,
}: {
  product: ProductId;
  style: StyleId;
  side?: Side;
  data: ArtData;
  className?: string;
}) {
  const product = getProduct(productId);
  const { width, height, radius } = product;
  return (
    <div
      className={`overflow-hidden shadow-lg ring-1 ring-black/10 ${className ?? ""}`}
      style={{ aspectRatio: `${width} / ${height}`, borderRadius: `${(radius / width) * 100}% / ${(radius / height) * 100}%` }}
    >
      <PrintArt product={product.id} style={style} side={side} data={data} className="block size-full" />
    </div>
  );
}
