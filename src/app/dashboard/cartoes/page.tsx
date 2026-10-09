import type { Metadata } from "next";
import Link from "next/link";
import { CreditCardIcon } from "lucide-react";
import { BatchForm } from "@/components/dashboard/batch-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CARD_COPY, displayUrl, getProduct, getStyle, qrPath } from "@/lib/card";
import { buildCardUrl } from "@/lib/cards";
import { listBatches } from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getSiteUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Cartões em branco" };

export default async function BatchesPage() {
  const batches = await listBatches();
  // Prévia: arte de avaliação com um QR Code de exemplo.
  const sample = buildCardUrl(getSiteUrl(), "exemplo2", "qr");
  const art = { businessName: null, copy: CARD_COPY.review, qr: qrPath(sample), url: displayUrl(sample) };

  return (
    <>
      <PageHeader
        title="Cartões em branco"
        description="Gere lotes de cartões e placas com QR Code único. Cada peça é ativada por quem a abrir pela primeira vez, escolhendo o negócio no Google."
      />

      <Card className="mb-6">
        <CardContent>
          <BatchForm art={art} />
        </CardContent>
      </Card>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CreditCardIcon className="size-10 text-muted-foreground" />
            <p className="font-medium">Nenhum lote ainda</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Gere um lote acima para baixar o PDF de impressão e a lista de links para gravar nos chips NFC.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Ativadas</TableHead>
                <TableHead className="text-right">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link href={`/dashboard/cartoes/${b.id}`} className="font-medium hover:underline">
                      {b.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getProduct(b.product).label}
                    <span className="text-muted-foreground"> · {getStyle(b.style).label}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={b.activated === b.quantity ? "default" : "secondary"} className="tabular-nums">
                      {formatNumber(b.activated)} de {formatNumber(b.quantity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatDateTime(b.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
