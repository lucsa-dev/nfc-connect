import { toCsv } from "@/lib/csv";
import { getProspectsByPlace, getProspectSearch, isCurrentUserAdmin } from "@/lib/data";
import { readProspects } from "@/lib/market";
import { prospectSheetRows, SHEET_COLUMNS } from "@/lib/prospects";
import { slugify } from "@/lib/slug";

/** Planilha da busca: contatos, proposta em PDF e WhatsApp com a mensagem, um negócio por linha. */

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/dashboard/prospeccao/[searchId]/planilha">) {
  // Rotas não passam pelo layout do painel: confere o acesso aqui.
  if (!(await isCurrentUserAdmin())) return new Response("Não autorizado", { status: 401 });
  const { searchId } = await ctx.params;
  const search = await getProspectSearch(searchId);
  const prospects = readProspects(search.results).filter((p) => !p.closed);
  const listed = await getProspectsByPlace(prospects.map((p) => p.placeId));

  const rows = prospectSheetRows(prospects, {
    origin: new URL(request.url).origin,
    searchId,
    nearby: search.center_lat !== null,
    listed,
  });

  // BOM para o Excel reconhecer UTF-8.
  const csv = "﻿" + toCsv(rows, [...SHEET_COLUMNS]);
  const filename = `prospeccao-${slugify(`${search.term} ${search.area}`) || search.id}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
