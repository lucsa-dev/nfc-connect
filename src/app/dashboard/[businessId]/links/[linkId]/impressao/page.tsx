import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/cards/print-button";
import { ArtPreview } from "@/components/cards/print-art";
import { pageCss, PrintSheets, type PrintFormat } from "@/components/cards/print-sheets";
import { PageHeader } from "@/components/dashboard/page-header";
import { CARD_COPY, displayUrl, getProduct, getStyle, PRODUCTS, qrPath, STYLES } from "@/lib/card";
import { getLink } from "@/lib/data";
import { buildPublicLinkUrl, getSiteUrl } from "@/lib/urls";

type Props = PageProps<"/dashboard/[businessId]/links/[linkId]/impressao">;

export const metadata: Metadata = { title: "Placa e cartão para impressão" };

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

export default async function PrintPage({ params, searchParams }: Props) {
  const { businessId, linkId } = await params;
  const query = await searchParams;
  const pick = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : null);
  const product = getProduct(pick("produto"));
  const style = getStyle(pick("estilo"));
  const format: PrintFormat = pick("formato") === "a4" ? "a4" : "grafica";
  // Padrão: arte TopTap sem o nome do negócio. Personalizado só para lotes grandes.
  const personalized = pick("nome") === "1";

  const link = await getLink(businessId, linkId);
  const qrUrl = buildPublicLinkUrl(getSiteUrl(), link.business.slug, link.slug, "qr");
  const data = {
    businessName: personalized ? link.business.name : null,
    copy: CARD_COPY[link.type],
    qr: qrPath(qrUrl),
    url: displayUrl(qrUrl),
  };

  const base = `/dashboard/${businessId}/links/${linkId}/impressao`;
  const href = (changes: Record<string, string>) =>
    `${base}?${new URLSearchParams({ produto: product.id, estilo: style.id, formato: format, nome: personalized ? "1" : "0", ...changes })}`;

  const isPlaque = product.kind === "plaque";
  const formatHint =
    format === "grafica"
      ? `Arte final em ${product.width} × ${product.height} mm + 3 mm de sangria${product.sides.length > 1 ? ", frente e verso" : ", só frente"}. Envie o PDF para a gráfica. A linha vermelha tracejada marca o corte e não sai na impressão.`
      : "Para imprimir em casa (papel adesivo ou fotográfico), com linhas de corte.";

  return (
    <>
      <style>{pageCss(format, product.id)}</style>
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { href: "/dashboard", label: "Negócios" },
            { href: `/dashboard/${businessId}`, label: link.business.name },
            { href: `/dashboard/${businessId}/links/${linkId}`, label: link.name },
          ]}
          title="Placa e cartão para impressão"
          description="Escolha o produto, o estilo e o formato, depois use “Imprimir / salvar PDF”. O QR Code já aponta para este link."
          actions={<PrintButton />}
        />

        <h2 className="mb-3 text-sm font-medium">Produto</h2>
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <Link
              key={p.id}
              href={href({ produto: p.id })}
              scroll={false}
              aria-current={p.id === product.id ? "true" : undefined}
              className="grid content-between gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition hover:ring-primary/50 aria-[current=true]:ring-2 aria-[current=true]:ring-primary"
            >
              <div className="flex h-36 items-center justify-center">
                <ArtPreview
                  product={p.id}
                  style={style.id}
                  data={data}
                  className={p.height > p.width ? "h-full" : "w-full"}
                />
              </div>
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Estilo">
            {STYLES.map((s) => (
              <Chip key={s.id} href={href({ estilo: s.id })} active={s.id === style.id}>
                {s.label}
              </Chip>
            ))}
          </div>
          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Formato">
            <Chip href={href({ formato: "grafica" })} active={format === "grafica"}>Gráfica (PDF)</Chip>
            <Chip href={href({ formato: "a4" })} active={format === "a4"}>Folha A4</Chip>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Identidade">
            <Chip href={href({ nome: "0" })} active={!personalized}>Padrão TopTap</Chip>
            <Chip href={href({ nome: "1" })} active={personalized}>Com nome do negócio</Chip>
          </div>
        </div>
        <p className="mb-2 max-w-3xl text-sm text-muted-foreground">
          {personalized
            ? "Personalizado com o nome do negócio: use para lotes grandes. "
            : "Arte padrão TopTap: só o QR Code muda de um negócio para outro. "}
          {formatHint} Na janela de impressão, use escala 100% e ative “Gráficos de fundo”.
        </p>
        {isPlaque && (
          <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
            <strong className="text-foreground">Chip NFC:</strong> cole a TAG atrás da área “{data.copy.cta}”. A placa é colada
            no balcão pelo verso, então só tem frente.
          </p>
        )}
      </div>

      <PrintSheets format={format} product={product.id} style={style.id} items={[data]} />
    </>
  );
}
