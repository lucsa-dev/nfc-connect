import { getProduct } from "@/lib/card";
import { buildCardUrl } from "@/lib/cards";
import { toCsv } from "@/lib/csv";
import { getBatch } from "@/lib/data";
import { slugify } from "@/lib/slug";
import { getSiteUrl } from "@/lib/urls";

/** Lista de links do lote, na ordem de impressão, para gravar os chips NFC. */
export async function GET(_request: Request, ctx: RouteContext<"/dashboard/cartoes/[batchId]/export">) {
  const { batchId } = await ctx.params;
  const batch = await getBatch(batchId);
  const siteUrl = getSiteUrl();

  const rows = batch.cards.map((card) => ({
    posicao: card.position,
    codigo: card.code,
    produto: getProduct(batch.product).label,
    link_nfc: buildCardUrl(siteUrl, card.code),
    link_qr: buildCardUrl(siteUrl, card.code, "qr"),
    status: card.link_id ? "ativada" : "em branco",
    negocio: card.link?.business?.name ?? "",
    ativada_em: card.activated_at ?? "",
  }));

  // BOM para o Excel reconhecer UTF-8.
  const csv = "﻿" + toCsv(rows, ["posicao", "codigo", "produto", "link_nfc", "link_qr", "status", "negocio", "ativada_em"]);
  const filename = `lote-${slugify(batch.name) || batch.id}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
