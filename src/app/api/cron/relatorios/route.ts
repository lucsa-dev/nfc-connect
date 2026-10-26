import { apifyEnabled } from "@/lib/apify";
import { runMonthlyReports } from "@/lib/market-server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Relatório mensal dos clientes com plano (a peça vale um ano). Roda todo dia:
 * cada cliente ganha um relatório novo quando o último faz 30 dias, e os que
 * ficaram gerando na Apify são finalizados na rodada seguinte.
 * Agendado em vercel.json; a Vercel envia "Authorization: Bearer $CRON_SECRET".
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  if (!apifyEnabled()) return Response.json({ ok: true, skipped: "Configure APIFY_TOKEN" });

  const result = await runMonthlyReports(createAdminClient());
  console.log("Relatórios mensais", result);
  return Response.json({ ok: true, ...result });
}
