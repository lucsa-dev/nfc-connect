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

/**
 * Folhas de impressão. Com uma peça só, a folha A4 é preenchida com cópias dela;
 * com várias (lote), cada posição recebe uma peça diferente, na ordem.
 */
export function PrintSheets({
  format,
  product: productId,
  style,
  items,
}: {
  format: PrintFormat;
  product: ProductId;
  style: StyleId;
  items: ArtData[];
}) {
  const product = getProduct(productId);
  const singleSided = product.sides.length === 1;
  const batch = items.length > 1;

  if (format === "grafica") {
    // Arquivo único com frente e verso de cada peça em sequência (dados variáveis).
    const { fullWidth, fullHeight } = productSize(product);
    return (
      <div className="flex flex-wrap gap-8 print:block">
        {items.flatMap((data, i) =>
          product.sides.map((side) => (
            <Page
              key={`${i}-${side}`}
              width={fullWidth}
              height={fullHeight}
              label={`${batch ? `#${i + 1} · ` : ""}${singleSided ? "Arte final (só frente)" : SIDE_LABEL[side]}`}
            >
              <PrintArt product={product.id} style={style} side={side} data={data} bleed className="absolute inset-0" />
              {/* Linha de corte: só na tela, não sai na impressão */}
              <div className="pointer-events-none absolute inset-[3mm] border border-dashed border-red-500/70 print:hidden" />
            </Page>
          )),
        )}
      </div>
    );
  }

  const layout = sheetLayout(product);
  const perSheet = layout.positions.length;
  const sheets = batch
    ? Array.from({ length: Math.ceil(items.length / perSheet) }, (_, s) => items.slice(s * perSheet, (s + 1) * perSheet))
    : [layout.positions.map(() => items[0]!)];

  return (
    <div className="grid gap-8 print:block">
      {sheets.flatMap((sheet, s) =>
        product.sides.map((side) => {
          const prefix = sheets.length > 1 ? `Folha ${s + 1} de ${sheets.length}: ` : "";
          const label = singleSided
            ? `${prefix || "Folha A4"}${prefix ? `peças ${s * perSheet + 1} a ${s * perSheet + sheet.length}` : ""}`
            : `${prefix}${side === "front" ? "frentes" : "versos (espelhado para frente e verso)"}`;
          return (
            <Page key={`${s}-${side}`} width={210} height={297} label={label}>
              {sheet.map((data, i) => {
                const p = layout.positions[i]!;
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
          );
        }),
      )}
    </div>
  );
}
