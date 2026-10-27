"use server";

import { syncReport } from "@/lib/market-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Confere os relatórios do negócio que ainda estão gerando (chamado pela /conta
 * enquanto houver um). O cliente não lê relatórios "running" pelo RLS: depois de
 * conferir a participação, a conferência usa a chave secreta.
 */
export async function checkBusinessReports(businessId: string): Promise<{ status: "running" | "ready" }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { status: "ready" };
  const { data: member } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) return { status: "ready" };

  const admin = createAdminClient();
  const { data: running } = await admin.from("market_reports").select("id").eq("business_id", businessId).eq("status", "running");
  let stillRunning = false;
  for (const r of running ?? []) {
    const status = await syncReport(admin, r.id).catch((error) => {
      console.error("Falha ao conferir o relatório", r.id, error);
      return "running" as const;
    });
    if (status === "running") stillRunning = true;
  }
  return { status: stillRunning ? "running" : "ready" };
}
