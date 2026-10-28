import { isCurrentUserAdmin } from "@/lib/data";
import { readProspects } from "@/lib/market";
import { PRICING } from "@/lib/pricing";
import { renderProposal } from "@/lib/proposal-pdf";
import { proposalFileName } from "@/lib/prospects";
import { getSiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/urls";

/**
 * PDF da proposta de um negócio da busca, sem precisar abrir a ficha (link da
 * planilha). Se o negócio já está na lista de prospecção, usa a proposta
 * configurada na ficha. ?baixar=1 força o download.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/dashboard/prospeccao/[searchId]/proposta/[placeId]">) {
  // Rotas não passam pelo layout do painel: confere o acesso aqui.
  if (!(await isCurrentUserAdmin())) return new Response("Não autorizado", { status: 401 });
  const { searchId, placeId } = await ctx.params;
  const url = new URL(request.url);
  const supabase = await createClient();

  const { data: listed } = await supabase.from("prospects").select("id").eq("place_id", placeId).maybeSingle();
  if (listed) return Response.redirect(new URL(`/dashboard/prospeccao/clientes/${listed.id}/proposta${url.search}`, url), 302);

  const { data: search, error } = await supabase.from("prospect_searches").select("term, area, center_lat, results").eq("id", searchId).maybeSingle();
  if (error && error.code !== "22P02") throw error;
  const found = search && readProspects(search.results).find((p) => p.placeId === placeId);
  if (!search || !found) return new Response("Negócio não encontrado nesta busca", { status: 404 });

  const pdf = await renderProposal({
    name: found.name,
    contactName: null,
    data: found,
    // Na busca "perto de mim" a posição não é de uma busca "termo em região".
    search: search.center_lat === null ? { term: search.term, area: search.area } : null,
    priceCents: PRICING.service,
    note: null,
    whatsapp: (await getSiteSettings()).whatsapp,
    siteUrl: getSiteUrl(),
    date: new Date(),
  });

  const fileName = proposalFileName(found.name);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.has("baixar") ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
