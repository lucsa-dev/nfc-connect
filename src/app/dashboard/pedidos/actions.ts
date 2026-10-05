"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { businessSlugCandidates, leadDescription } from "@/lib/leads";
import { reviewUrl } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

/**
 * Cria o negócio (e o link de avaliação, se houver Place ID) a partir do lead
 * e marca o lead como convertido.
 */
export async function convertLead(leadId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) return { message: "Pedido não encontrado." };
  if (lead.business_id) redirect(`/dashboard/${lead.business_id}`);

  const name = (lead.place_name || lead.contact_name || "").trim();
  if (name.length < 2) return { message: "O pedido não tem o nome do negócio." };

  let businessId: string | null = null;
  for (const slug of businessSlugCandidates(name, lead.place_city)) {
    const { data, error } = await supabase
      .from("businesses")
      .insert({ name: name.slice(0, 120), slug, description: leadDescription(lead) || null })
      .select("id")
      .single();
    if (!error) {
      businessId = data.id;
      break;
    }
    if (error.code !== "23505") return { message: "Não foi possível criar o negócio." };
  }
  if (!businessId) return { message: "Não achei um endereço livre para este negócio. Crie manualmente." };

  if (lead.place_id) {
    const { error } = await supabase.from("links").insert({
      business_id: businessId,
      name: "Avaliação Google",
      slug: "avaliacao",
      type: "review",
      url: reviewUrl(lead.place_id),
    });
    if (error) console.error("Falha ao criar link de avaliação", error);
  }

  await supabase.from("leads").update({ status: "convertido", business_id: businessId }).eq("id", leadId);

  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/${businessId}`);
}

export async function setLeadStatus(leadId: string, status: "lead" | "descartado"): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("leads").update({ status }).eq("id", leadId).neq("status", "convertido");
  if (error) return { message: "Não foi possível atualizar o pedido." };
  revalidatePath("/dashboard/pedidos", "layout");
  return { ok: true, message: status === "descartado" ? "Pedido descartado." : "Pedido reaberto." };
}
