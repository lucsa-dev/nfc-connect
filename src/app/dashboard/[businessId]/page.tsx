import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, LinkIcon } from "lucide-react";
import { BusinessFormDialog } from "@/components/dashboard/business-form-dialog";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { GooglePanel } from "@/components/dashboard/google-panel";
import { CopyButton } from "@/components/dashboard/copy-button";
import { LinkFormDialog } from "@/components/dashboard/link-form-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { QrDialog } from "@/components/dashboard/qr-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBusinessWithLinks, getPlaceSnapshots } from "@/lib/data";
import { analysisEnabled, metricsEnabled, placesEnabled } from "@/lib/google";
import { formatNumber } from "@/lib/format";
import { LINK_TYPE_INFO } from "@/lib/link-types";
import { buildPublicLinkUrl, getSiteUrl } from "@/lib/urls";
import { createLink, deleteBusiness, updateBusiness } from "../actions";

// Server Actions desta página: busca no Maps (scraper, até ~4 min) e análise da IA.
export const maxDuration = 300;

export async function generateMetadata({ params }: PageProps<"/dashboard/[businessId]">): Promise<Metadata> {
  const { businessId } = await params;
  const business = await getBusinessWithLinks(businessId);
  return { title: business.name };
}

export default async function BusinessPage({ params }: PageProps<"/dashboard/[businessId]">) {
  const { businessId } = await params;
  const [business, snapshots] = await Promise.all([getBusinessWithLinks(businessId), getPlaceSnapshots(businessId)]);
  const siteUrl = getSiteUrl();
  const host = siteUrl.replace(/^https?:\/\//, "");

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard", label: "Negócios" }]}
        title={business.name}
        description={
          <>
            <span className="font-mono text-xs">{host}/{business.slug}</span>
            {business.description && <p className="mt-1 whitespace-pre-line">{business.description}</p>}
          </>
        }
        actions={
          <>
            <BusinessFormDialog
              action={updateBusiness.bind(null, business.id)}
              defaults={{ name: business.name, slug: business.slug, description: business.description }}
              siteUrl={siteUrl}
            />
            <ConfirmDelete
              title="Excluir negócio?"
              description={`"${business.name}" e todos os seus links e estatísticas serão excluídos. As TAGs e QR Codes deixarão de funcionar.`}
              action={deleteBusiness.bind(null, business.id)}
            />
          </>
        }
      />

      <GooglePanel
        business={business}
        snapshots={snapshots}
        placesEnabled={placesEnabled()}
        metricsEnabled={metricsEnabled()}
        analysisEnabled={analysisEnabled()}
      />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Links</h2>
        <LinkFormDialog action={createLink.bind(null, business.id)} urlPrefix={`/${business.slug}/`} />
      </div>

      {business.links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LinkIcon className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum link ainda</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crie um link de avaliação, Pix ou cartão de visita para gravar na TAG NFC e gerar o QR Code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link</TableHead>
                <TableHead>Endereço da TAG NFC</TableHead>
                <TableHead className="text-right">Acessos</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {business.links.map((link) => {
                const nfcUrl = buildPublicLinkUrl(siteUrl, business.slug, link.slug);
                const qrUrl = buildPublicLinkUrl(siteUrl, business.slug, link.slug, "qr");
                const detailsHref = `/dashboard/${business.id}/links/${link.id}`;
                return (
                  <TableRow key={link.id}>
                    <TableCell>
                      <Link href={detailsHref} className="font-medium hover:underline">
                        {link.name}
                      </Link>
                      <div className="mt-1 flex gap-1.5">
                        <Badge variant="secondary">{LINK_TYPE_INFO[link.type].label}</Badge>
                        {!link.is_active && <Badge variant="outline">Inativo</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="max-w-[18rem] truncate text-xs">{nfcUrl}</code>
                        <CopyButton value={nfcUrl} label="Copiar link da TAG NFC" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(link.click_count)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <QrDialog title={link.name} url={qrUrl} filename={`qr-${business.slug}-${link.slug}`} />
                        <Button variant="ghost" size="icon-sm" aria-label="Detalhes" nativeButton={false} render={<Link href={detailsHref} />}>
                          <ChevronRightIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
