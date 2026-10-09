"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { databaseErrorState, type ActionState } from "@/lib/action-state";
import type { MapsTarget } from "@/lib/apify-maps";
import { analysisEnabled, analyzeSnapshot, collectProfiles, storeProfiles, targetOf } from "@/lib/google";
import { PLACE_ID_PATTERN, readPlaceProfile } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";
import { businessSchema, fieldErrorsOf, formDataToObject, linkSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

// Negócios -----------------------------------------------------------------

export async function createBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = businessSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { data, error } = await supabase.from("businesses").insert(parsed.data).select("id").single();
  if (error) return databaseErrorState(error, values);

  revalidatePath("/dashboard");
  redirect(`/dashboard/${data.id}`);
}

export async function updateBusiness(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = businessSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", businessId);
  if (error) return databaseErrorState(error, values);

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Negócio atualizado." };
}

export async function deleteBusiness(businessId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("businesses").delete().eq("id", businessId);
  if (error) return { message: "Não foi possível excluir o negócio." };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Links --------------------------------------------------------------------

export async function createLink(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = linkSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase.from("links").insert({ ...parsed.data, business_id: businessId });
  if (error) return databaseErrorState(error, values);

  revalidatePath(`/dashboard/${businessId}`);
  return { ok: true, message: "Link criado." };
}

export async function updateLink(
  businessId: string,
  linkId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = linkSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase
    .from("links")
    .update(parsed.data)
    .eq("id", linkId)
    .eq("business_id", businessId);
  if (error) return databaseErrorState(error, values);

  revalidatePath(`/dashboard/${businessId}`, "layout");
  return { ok: true, message: "Link atualizado." };
}

export async function deleteLink(businessId: string, linkId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("links")
    .delete()
    .eq("id", linkId)
    .eq("business_id", businessId);
  if (error) return { message: "Não foi possível excluir o link." };

  revalidatePath(`/dashboard/${businessId}`);
  redirect(`/dashboard/${businessId}`);
}

// Google Maps --------------------------------------------------------------

export type GoogleLinkInput = { placeId: string } | { query: string };

/**
 * Vincula um negócio já cadastrado ao Google e faz a primeira coleta:
 * pelo Place ID (busca da Places API) ou por "Nome, Cidade - UF" (scraper).
 */
export async function linkGoogle(businessId: string, input: GoogleLinkInput): Promise<ActionState> {
  const supabase = await requireUser();
  const { data: business } = await supabase.from("businesses").select("id, name, place_id, maps_query").eq("id", businessId).maybeSingle();
  if (!business) return { message: "Negócio não encontrado." };

  let target: MapsTarget;
  if ("placeId" in input) {
    if (!PLACE_ID_PATTERN.test(input.placeId)) return { message: "Negócio do Google inválido." };
    target = { ...targetOf(business), placeId: input.placeId };
    const { error } = await supabase.from("businesses").update({ place_id: input.placeId }).eq("id", businessId);
    if (error) {
      return { message: error.code === "23505" ? "Outro negócio seu já está vinculado a este lugar do Google." : "Não foi possível vincular." };
    }
  } else {
    const query = input.query.trim().slice(0, 200);
    if (query.length < 3) return { message: "Digite o nome e a cidade do negócio." };
    target = { ...targetOf(business), placeId: null, query };
    await supabase.from("businesses").update({ maps_query: query }).eq("id", businessId);
  }

  const profiles = await collectProfiles([target]);
  const saved = await storeProfiles(supabase, [target], profiles);
  revalidatePath(`/dashboard/${businessId}`);
  if (!saved) {
    return { message: "Não encontramos o negócio no Google Maps. Confira o nome e a cidade e tente de novo." };
  }
  return { ok: true, message: `Vinculado a “${profiles.get(businessId)!.name}”.` };
}

/** Desfaz o vínculo (ex.: a busca achou o negócio errado). As coletas antigas são apagadas. */
export async function unlinkGoogle(businessId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("businesses").update({ place_id: null }).eq("id", businessId);
  if (error) return { message: "Não foi possível desvincular." };
  await supabase.from("place_snapshots").delete().eq("business_id", businessId);
  revalidatePath(`/dashboard/${businessId}`);
  return { ok: true, message: "Vínculo com o Google removido." };
}

/** Coleta agora os dados do Google (nota, avaliações, perfil). */
export async function refreshGoogle(businessId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { data: business } = await supabase.from("businesses").select("id, name, place_id, maps_query").eq("id", businessId).maybeSingle();
  if (!business?.place_id && !business?.maps_query) return { message: "Este negócio não está vinculado ao Google." };

  const target = targetOf(business);
  const saved = await storeProfiles(supabase, [target], await collectProfiles([target]));
  if (!saved) return { message: "Não foi possível buscar os dados no Google. Tente de novo em instantes." };

  revalidatePath(`/dashboard/${businessId}`);
  return { ok: true, message: "Dados do Google atualizados." };
}

/** Gera (ou refaz) a análise da IA sobre a coleta mais recente. */
export async function analyzeGoogle(businessId: string): Promise<ActionState> {
  if (!analysisEnabled()) return { message: "Configure a variável OPENAI_API_KEY para usar a análise." };
  const supabase = await requireUser();
  const { data: snapshot } = await supabase
    .from("place_snapshots")
    .select("id, profile")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const profile = snapshot ? readPlaceProfile(snapshot.profile) : null;
  if (!snapshot || !profile) return { message: "Atualize os dados do Google antes de analisar." };

  const ok = await analyzeSnapshot(supabase, snapshot.id, profile);
  if (!ok) return { message: "A análise falhou. Tente de novo em instantes." };

  revalidatePath(`/dashboard/${businessId}`);
  return { ok: true, message: "Análise pronta." };
}
