import { purgeExpired } from "@/lib/market-server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limpeza diária: apaga o conteúdo da Places API guardado há mais de 30 dias
 * (mapas de ranking e coletas feitas pela Places API), como pedem os termos de uso.
 * Agendado em vercel.json; a Vercel envia "Authorization: Bearer $CRON_SECRET".
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const deleted = await purgeExpired(createAdminClient());
  console.log("Limpeza do conteúdo expirado da Places API", deleted);
  return Response.json({ ok: true, deleted });
}
