"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { apifyEnabled } from "@/lib/apify";
import { placesEnabled } from "@/lib/google";
import { runRankGrid, startProspect, startReport, syncProspect, syncReport } from "@/lib/market-server";
import { PLACE_ID_PATTERN } from "@/lib/places";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

const searchSchema = z.object({
  term: z.string().trim().min(2, "Digite o que o cliente busca (ex.: padaria).").max(80),
  area: z.string().trim().min(2, "Digite o bairro ou a cidade.").max(120),
});

export type ReportTarget = { businessId: string } | { placeId: string; name: string };

/** Inicia um relatório de concorrência e abre a página dele. */
export async function createReport(target: ReportTarget, input: { term: string; area: string }): Promise<ActionState> {
  if (!apifyEnabled()) return { message: "Configure a variável APIFY_TOKEN para buscar os concorrentes." };
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  const supabase = await requireUser();

  let businessId: string | null = null;
  let placeId: string;
  let name: string;
  if ("businessId" in target) {
    const { data: business } = await supabase.from("businesses").select("id, name, place_id").eq("id", target.businessId).maybeSingle();
    if (!business) return { message: "Negócio não encontrado." };
    if (!business.place_id) return { message: "Vincule o negócio ao Google antes de gerar o relatório." };
    ({ id: businessId, place_id: placeId, name } = business as { id: string; place_id: string; name: string });
  } else {
    if (!PLACE_ID_PATTERN.test(target.placeId)) return { message: "Negócio do Google inválido." };
    placeId = target.placeId;
    name = target.name.trim() || "Negócio";
    // Se o prospecto já é cliente, o relatório fica no negócio.
    const { data: existing } = await supabase.from("businesses").select("id").eq("place_id", placeId).limit(1).maybeSingle();
    businessId = existing?.id ?? null;
  }

  let reportId: string;
  try {
    reportId = await startReport(supabase, { businessId, placeId, name, ...parsed.data });
  } catch (error) {
    console.error("Falha ao iniciar o relatório", error);
    return { message: "Não foi possível iniciar a busca no Google Maps. Tente de novo." };
  }
  if (businessId) revalidatePath(`/dashboard/${businessId}`);
  redirect(`/dashboard/relatorios/${reportId}`);
}

/** Confere se a coleta terminou (chamado pela página enquanto está "running"). */
export async function checkReport(reportId: string): Promise<{ status: "running" | "ready" | "failed" }> {
  const supabase = await requireUser();
  try {
    const status = await syncReport(supabase, reportId);
    if (status !== "running") revalidatePath(`/dashboard/relatorios/${reportId}`);
    return { status };
  } catch (error) {
    console.error("Falha ao conferir o relatório", error);
    return { status: "running" };
  }
}

export async function createRankGrid(reportId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const result = await runRankGrid(supabase, reportId);
  if (result.ok) revalidatePath(`/dashboard/relatorios/${reportId}`);
  return result;
}

export async function deleteReport(reportId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { data } = await supabase.from("market_reports").delete().eq("id", reportId).select("business_id").maybeSingle();
  if (!data) return { message: "Não foi possível excluir o relatório." };
  redirect(data.business_id ? `/dashboard/${data.business_id}` : "/dashboard/prospeccao");
}

// Prospecção -------------------------------------------------------------------------

export async function createProspectSearch(input: { term: string; area: string }): Promise<ActionState> {
  if (!placesEnabled() && !apifyEnabled()) return { message: "Configure a variável GOOGLE_PLACES_API_KEY para buscar negócios." };
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message };
  const supabase = await requireUser();
  let searchId: string;
  try {
    searchId = await startProspect(supabase, parsed.data);
  } catch (error) {
    console.error("Falha ao iniciar a prospecção", error);
    return { message: "Não foi possível iniciar a busca no Google Maps. Tente de novo." };
  }
  redirect(`/dashboard/prospeccao/${searchId}`);
}

const nearbySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().min(300).max(5000),
  term: z.string().trim().max(80),
});

/** Prospecção ao redor da localização atual do vendedor (pega pelo navegador). */
export async function createNearbyProspectSearch(input: { lat: number; lng: number; radiusM: number; term: string }): Promise<ActionState> {
  if (!placesEnabled() && !apifyEnabled()) return { message: "Configure a variável GOOGLE_PLACES_API_KEY para buscar negócios." };
  const parsed = nearbySchema.safeParse(input);
  if (!parsed.success) return { message: "Localização inválida. Tente de novo." };
  const { lat, lng, radiusM, term } = parsed.data;
  if (term && term.length < 2) return { message: "Digite o tipo de negócio ou deixe em branco." };
  const supabase = await requireUser();
  let searchId: string;
  try {
    searchId = await startProspect(supabase, { term: term || null, center: { lat, lng }, radiusM });
  } catch (error) {
    console.error("Falha ao iniciar a prospecção perto de você", error);
    return { message: "Não foi possível iniciar a busca no Google Maps. Tente de novo." };
  }
  redirect(`/dashboard/prospeccao/${searchId}`);
}

export async function checkProspect(searchId: string): Promise<{ status: "running" | "ready" | "failed" }> {
  const supabase = await requireUser();
  try {
    const status = await syncProspect(supabase, searchId);
    if (status !== "running") revalidatePath(`/dashboard/prospeccao/${searchId}`);
    return { status };
  } catch (error) {
    console.error("Falha ao conferir a prospecção", error);
    return { status: "running" };
  }
}
