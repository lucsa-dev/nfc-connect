import { isCurrentUserAdmin } from "@/lib/data";
import { renderProposal } from "@/lib/proposal-pdf";
import { proposalFileName, readProspectData } from "@/lib/prospects";
import { getSiteSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/urls";

/**
 * PDF da proposta comercial de um cliente em prospecção.
 * ?baixar=1 força o download; sem ele, o navegador abre o PDF.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/dashboard/prospeccao/clientes/[prospectId]/proposta">) {
  // Rotas não passam pelo layout do painel: confere o acesso aqui.
  if (!(await isCurrentUserAdmin())) return new Response("Não autorizado", { status: 401 });
  const { prospectId } = await ctx.params;
  const supabase = await createClient();
  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("name, contact_name, data, price_cents, proposal_note, search:prospect_searches(term, area, center_lat)")
    .eq("id", prospectId)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!prospect) return new Response("Cliente não encontrado", { status: 404 });

  // Na busca "perto de mim" a posição não é de uma busca "termo em região".
  const search = prospect.search && prospect.search.center_lat === null ? { term: prospect.search.term, area: prospect.search.area } : null;
  const pdf = await renderProposal({
    name: prospect.name,
    contactName: prospect.contact_name,
    data: readProspectData(prospect.data),
    search,
    priceCents: prospect.price_cents,
    note: prospect.proposal_note,
    whatsapp: (await getSiteSettings()).whatsapp,
    siteUrl: getSiteUrl(),
    date: new Date(),
  });

  const download = new URL(request.url).searchParams.has("baixar");
  const fileName = proposalFileName(prospect.name);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
