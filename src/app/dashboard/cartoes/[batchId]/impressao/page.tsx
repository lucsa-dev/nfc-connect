import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/cards/print-button";
import { pageCss, PrintSheets, type PrintFormat } from "@/components/cards/print-sheets";
import { PageHeader } from "@/components/dashboard/page-header";
import { CARD_COPY, displayUrl, getProduct, getStyle, qrPath, sheetLayout } from "@/lib/card";
import { buildCardUrl } from "@/lib/cards";
import { getBatch } from "@/lib/data";
import { getSiteUrl } from "@/lib/urls";

type Props = PageProps<"/dashboard/cartoes/[batchId]/impressao">;

export const metadata: Metadata = { title: "Impressão do lote" };

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className="rounded-md px-2.5 py-1 text-sm text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
    >
      {children}
    </Link>
  );
}

export default async function BatchPrintPage({ params, searchParams }: Props) {
  const { batchId } = await params;
  const query = await searchParams;
  const format: PrintFormat = query.formato === "a4" ? "a4" : "grafica";
  const batch = await getBatch(batchId);
  const product = getProduct(batch.product);
  const style = getStyle(batch.style);
  const siteUrl = getSiteUrl();

  // Toda peça em branco vira um cartão de avaliação ao ser ativada.
  const items = batch.cards.map((card) => {
    const qrUrl = buildCardUrl(siteUrl, card.code, "qr");
    return { businessName: null, copy: CARD_COPY.review, qr: qrPath(qrUrl), url: displayUrl(qrUrl) };
  });

  const base = `/dashboard/cartoes/${batch.id}/impressao`;
  const sides = product.sides.length;
  const perSheet = sheetLayout(product).positions.length;
  const hint =
    format === "grafica"
      ? `PDF com ${items.length * sides} páginas de ${product.width} × ${product.height} mm + 3 mm de sangria: ${sides > 1 ? "frente e verso de cada peça, em sequência" : "uma página por peça"}. É o formato de dados variáveis que as gráficas usam.`
      : `${Math.ceil(items.length / perSheet)} folha(s) A4 com ${perSheet} peças cada${sides > 1 ? ", cada folha de frentes seguida da folha de versos (imprima frente e verso pela borda longa)" : ""}.`;

  return (
    <>
      <style>{pageCss(format, product.id)}</style>
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { href: "/dashboard/cartoes", label: "Cartões em branco" },
            { href: `/dashboard/cartoes/${batch.id}`, label: batch.name },
          ]}
          title="Impressão do lote"
          description={`${items.length} × ${product.label}, estilo ${style.label}. Cada peça tem um QR Code único, na mesma ordem da lista do lote.`}
          actions={<PrintButton />}
        />
        <div className="mb-2 flex rounded-lg bg-muted p-0.5 sm:w-fit" role="group" aria-label="Formato">
          <Chip href={base} active={format === "grafica"}>
            Gráfica (PDF)
          </Chip>
          <Chip href={`${base}?formato=a4`} active={format === "a4"}>
            Folha A4
          </Chip>
        </div>
        <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
          {hint} Na janela de impressão, escolha “Salvar como PDF”, escala 100% e ative “Gráficos de fundo”.
        </p>
      </div>

      <PrintSheets format={format} product={product.id} style={style.id} items={items} />
    </>
  );
}
