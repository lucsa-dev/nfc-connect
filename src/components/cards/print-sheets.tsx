import { PrintArt, type ArtData } from "@/components/cards/print-art";
import { getProduct, productSize, sheetLayout, type ProductId, type StyleId } from "@/lib/card";

export type PrintFormat = "grafica" | "a4";

/** CSS de página para o formato escolhido (o navegador usa no PDF). */
export function pageCss(format: PrintFormat, productId: ProductId) {
  const { fullWidth, fullHeight } = productSize(getProduct(productId));
  const size = format === "grafica" ? `${fullWidth}mm ${fullHeight}mm` : "210mm 297mm";
  return `@page { size: ${size}; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;
}

function Page({ width, height, label, children }: { width: number; height: number; label: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 print:block">
      <h3 className="text-sm font-medium text-muted-foreground print:hidden">{label}</h3>
      <div
        className="relative overflow-hidden bg-white shadow-md ring-1 ring-foreground/10 print:shadow-none print:ring-0"
        style={{ width: `${width}mm`, height: `${height}mm`, breakAfter: "page" }}
      >
        {children}
      </div>
    </section>
  );
}

const SIDE_LABEL = { front: "Frente", back: "Verso" } as const;

export function PrintSheets({
  format,
  product: productId,
  style,
  data,
}: {
  format: PrintFormat;
  product: ProductId;
  style: StyleId;
  data: ArtData;
}) {
  const product = getProduct(productId);
  const singleSided = product.sides.length === 1;

  if (format === "grafica") {
    const { fullWidth, fullHeight } = productSize(product);
    return (
      <div className="flex flex-wrap gap-8 print:block">
        {product.sides.map((side) => (
          <Page key={side} width={fullWidth} height={fullHeight} label={singleSided ? "Arte final (só frente)" : SIDE_LABEL[side]}>
            <PrintArt product={product.id} style={style} side={side} data={data} bleed className="absolute inset-0" />
            {/* Linha de corte: só na tela, não sai na impressão */}
            <div className="pointer-events-none absolute inset-[3mm] border border-dashed border-red-500/70 print:hidden" />
          </Page>
        ))}
      </div>
    );
  }

  const layout = sheetLayout(product);
  return (
    <div className="grid gap-8 print:block">
      {product.sides.map((side) => (
        <Page
          key={side}
          width={210}
          height={297}
          label={singleSided ? "Folha A4" : side === "front" ? "Folha 1: frentes" : "Folha 2: versos (espelhado para frente e verso)"}
        >
          {layout.positions.map((p, i) => {
            // No verso as colunas se invertem para alinhar na impressão frente e verso (borda longa).
            const x = side === "back" ? 210 - p.x - layout.width : p.x;
            return (
              <div
                key={i}
                className="absolute outline outline-[0.2mm] outline-offset-0 outline-neutral-300"
                style={{ left: `${x}mm`, top: `${p.y}mm`, width: `${layout.width}mm`, height: `${layout.height}mm` }}
              >
                <PrintArt product={product.id} style={style} side={side} data={data} className="block size-full" />
              </div>
            );
          })}
        </Page>
      ))}
    </div>
  );
}
