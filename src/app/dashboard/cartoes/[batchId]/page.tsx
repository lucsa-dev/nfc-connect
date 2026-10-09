import type { Metadata } from "next";
import Link from "next/link";
import { DownloadIcon, PrinterIcon } from "lucide-react";
import { ConfirmDelete } from "@/components/dashboard/confirm-delete";
import { CopyButton } from "@/components/dashboard/copy-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProduct, getStyle } from "@/lib/card";
import { buildCardUrl } from "@/lib/cards";
import { getBatch } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getSiteUrl } from "@/lib/urls";
import { deleteBatch } from "../actions";

type Props = PageProps<"/dashboard/cartoes/[batchId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const batch = await getBatch((await params).batchId);
  return { title: batch.name };
}

export default async function BatchPage({ params }: Props) {
  const { batchId } = await params;
  const batch = await getBatch(batchId);
  const siteUrl = getSiteUrl();
  const product = getProduct(batch.product);
  const activated = batch.cards.filter((c) => c.link_id).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ href: "/dashboard/cartoes", label: "Cartões em branco" }]}
        title={batch.name}
        description={`${product.label} · ${getStyle(batch.style).label} · ${formatNumber(activated)} de ${formatNumber(batch.quantity)} ativadas`}
        actions={
          <>
            <Button nativeButton={false} render={<Link href={`/dashboard/cartoes/${batch.id}/impressao`} />}>
              <PrinterIcon /> Imprimir
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href={`/dashboard/cartoes/${batch.id}/export`} download />}>
              <DownloadIcon /> Links (CSV)
            </Button>
            {activated === 0 && (
              <ConfirmDelete
                title="Excluir lote?"
                description="As peças deste lote deixarão de existir. Só exclua se elas ainda não foram impressas."
                action={deleteBatch.bind(null, batch.id)}
              />
            )}
          </>
        }
      />

      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Grave no chip NFC de cada peça o <strong className="text-foreground">link do chip</strong> (na ordem da impressão). O QR Code
        impresso já leva à mesma peça. Ao abrir uma peça em branco, a pessoa escolhe o negócio no Google e ela é ativada.
      </p>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Link do chip NFC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acessos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.cards.map((card) => {
              const url = buildCardUrl(siteUrl, card.code);
              const business = card.link?.business;
              return (
                <TableRow key={card.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{card.position}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="max-w-[20rem] truncate text-xs">{url}</code>
                      <CopyButton value={url} label="Copiar link do chip NFC" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {business ? (
                      <div>
                        <Link href={`/dashboard/${business.id}`} className="font-medium hover:underline">
                          {business.name}
                        </Link>
                        {card.activated_at && (
                          <div className="text-xs text-muted-foreground tabular-nums">ativada em {formatDateTime(card.activated_at)}</div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline">Em branco</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{card.link ? formatNumber(card.link.click_count) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
