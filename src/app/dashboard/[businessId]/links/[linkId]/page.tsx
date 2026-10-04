import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { CopyButton } from "@/components/dashboard/copy-button";
import { LinkFormDialog } from "@/components/dashboard/link-form-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { QrCode } from "@/components/dashboard/qr-code";
import { Breakdown, DailyChart, StatTile } from "@/components/dashboard/stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { summarizeVisits } from "@/lib/analytics";
import { getLink, getLinkVisits } from "@/lib/data";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { LINK_TYPE_INFO } from "@/lib/link-types";
import { parsePeriod, periodStart, PERIODS } from "@/lib/periods";
import { buildPublicLinkUrl, getSiteUrl } from "@/lib/urls";
import { deleteLink, updateLink } from "../../../actions";

type Props = PageProps<"/dashboard/[businessId]/links/[linkId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessId, linkId } = await params;
  const link = await getLink(businessId, linkId);
  return { title: `${link.name} · ${link.business.name}` };
}

function UrlRow({ label, url, hint }: { label: string; url: string; hint: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 text-xs">{url}</code>
        <CopyButton value={url} label={`Copiar ${label}`} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const SOURCE: Record<string, string> = { nfc: "NFC", qr: "QR Code" };
const DEVICE: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador", bot: "Robô" };

export default async function LinkPage({ params, searchParams }: Props) {
  const { businessId, linkId } = await params;
  const days = parsePeriod((await searchParams).dias);
  const link = await getLink(businessId, linkId);
  const visits = await getLinkVisits(link.id, periodStart(days));
  const summary = summarizeVisits(visits, { days });

  const siteUrl = getSiteUrl();
  const { business } = link;
  const nfcUrl = buildPublicLinkUrl(siteUrl, business.slug, link.slug);
  const qrUrl = buildPublicLinkUrl(siteUrl, business.slug, link.slug, "qr");
  const destination = link.url ?? `${nfcUrl}/pix`;
  const basePath = `/dashboard/${business.id}/links/${link.id}`;
  const recent = visits.filter((v) => !v.is_bot).slice(0, 25);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { href: "/dashboard", label: "Negócios" },
          { href: `/dashboard/${business.id}`, label: business.name },
        ]}
        title={link.name}
        description={
          <span className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{LINK_TYPE_INFO[link.type].product}</Badge>
            {link.is_active ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
          </span>
        }
        actions={
          <>
            <Button size="sm" nativeButton={false} render={<Link href={`${basePath}/impressao`} />}>
              <CreditCardIcon /> Placa e cartão para impressão
            </Button>
            <LinkFormDialog
              action={updateLink.bind(null, business.id, link.id)}
              urlPrefix={`/${business.slug}/`}
              defaults={link}
            />
            <ConfirmDelete
              title="Excluir link?"
              description="O link e as estatísticas serão excluídos. A TAG NFC e o QR Code deixarão de funcionar."
              action={deleteLink.bind(null, business.id, link.id)}
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <CardTitle>Gravação</CardTitle>
            <CardDescription>Endereços para a TAG NFC e o QR Code do cartão.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <UrlRow label="Link da TAG NFC" url={nfcUrl} hint="Grave este endereço na TAG (registro NDEF do tipo URL)." />
            <UrlRow label="Link do QR Code" url={qrUrl} hint="Já embutido no QR Code ao lado; o ?s=qr separa os acessos por QR nas estatísticas." />
            <div className="grid gap-1">
              <div className="text-sm font-medium">Destino</div>
              <a
                href={destination}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 truncate text-sm text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-3.5 shrink-0" />
                <span className="truncate">{link.url ?? "Página de Pix Copia e Cola"}</span>
              </a>
              {!link.url && link.pix_key && (
                <p className="text-xs text-muted-foreground">
                  Chave {link.pix_key} · {link.pix_name} · {link.pix_city}
                  {link.pix_amount ? ` · ${formatCurrency(Number(link.pix_amount))}` : ""}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>PNG 1024px ou SVG para impressão.</CardDescription>
          </CardHeader>
          <CardContent>
            <QrCode value={qrUrl} filename={`qr-${business.slug}-${link.slug}`} size={200} />
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 grid gap-4" aria-labelledby="stats-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="stats-title" className="text-lg font-semibold">
            Acessos
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Período">
              {PERIODS.map((p) => (
                <Link
                  key={p}
                  href={`${basePath}?dias=${p}`}
                  scroll={false}
                  aria-current={p === days ? "page" : undefined}
                  className="rounded-md px-2.5 py-1 text-sm text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm"
                >
                  {p} dias
                </Link>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<a href={`${basePath}/export?dias=${days}`} download />}
            >
              <DownloadIcon /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label={`Acessos em ${days} dias`} value={summary.total} />
          <StatTile label="Visitantes únicos" value={summary.uniqueVisitors} hint="Por IP anonimizado" />
          <StatTile label="Total desde a criação" value={link.click_count} />
          <StatTile label="Prévias de link ignoradas" value={summary.bots} hint="WhatsApp, Instagram, robôs" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acessos por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyChart data={summary.daily} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Breakdown title="Origem" data={summary.bySource} />
          <Breakdown title="Dispositivo" data={summary.byDevice} />
          <Breakdown title="Sistema" data={summary.byOs} />
          <Breakdown title="Navegador / app" data={summary.byBrowser} />
          <Breakdown title="Cidade" data={summary.byCity} />
        </div>

        <Card className="pb-0">
          <CardHeader>
            <CardTitle>Últimos acessos</CardTitle>
            <CardDescription>
              {formatNumber(Math.min(recent.length, summary.total))} mais recentes. Exporte o CSV para ver todos os campos.
            </CardDescription>
          </CardHeader>
          {recent.length === 0 ? (
            <CardContent className="pb-6 text-sm text-muted-foreground">Nenhum acesso no período.</CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Navegador</TableHead>
                  <TableHead>Local</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((v, i) => (
                  <TableRow key={`${v.created_at}-${i}`}>
                    <TableCell className="tabular-nums">{formatDateTime(v.created_at)}</TableCell>
                    <TableCell>{SOURCE[v.source] ?? v.source}</TableCell>
                    <TableCell>
                      {[v.device_vendor, DEVICE[v.device_type ?? ""] ?? v.device_type].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell>{[v.os, v.os_version].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{v.browser ?? "—"}</TableCell>
                    <TableCell>{[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </>
  );
}
