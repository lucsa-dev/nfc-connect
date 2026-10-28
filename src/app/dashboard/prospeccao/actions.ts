"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import type { Json } from "@/lib/database.types";
import { fetchPlaceProfile } from "@/lib/google";
import { readProspects, type Prospect } from "@/lib/market";
import { PRICING } from "@/lib/pricing";
import { instagramHandle, parseBrazilPhone, parsePriceCents, PROSPECT_STATUSES, type ProspectStatus } from "@/lib/prospects";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

const clientPath = (id: string) => `/dashboard/prospeccao/clientes/${id}`;

/**
 * Coloca um negócio da busca na lista de prospecção e abre a ficha dele.
 * Se já está na lista, só abre. Sem telefone (buscas antigas), tenta a Places API.
 */
export async function addProspect(searchId: string, placeId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { data: existing } = await supabase.from("prospects").select("id").eq("place_id", placeId).maybeSingle();
  if (existing) redirect(clientPath(existing.id));

  const { data: search } = await supabase.from("prospect_searches").select("results").eq("id", searchId).maybeSingle();
  const found = search && readProspects(search.results).find((p) => p.placeId === placeId);
  if (!found) return { message: "Negócio não encontrado nesta busca." };

  let contact = found.contact;
  if (!contact?.phone) {
    const profile = await fetchPlaceProfile(placeId);
    if (profile) contact = { emails: [], instagram: null, ...contact, phone: profile.phone, website: contact?.website ?? profile.website };
  }

  // Sem as avaliações recentes: a proposta usa só os números do perfil.
  const data: Prospect = { ...found, recent: [], contact };
  const { data: created, error } = await supabase
    .from("prospects")
    .insert({
      search_id: searchId,
      place_id: placeId,
      name: found.name.slice(0, 200),
      data: data as unknown as Json,
      phone: contact?.phone ?? null,
      email: contact?.emails[0] ?? null,
      instagram: contact?.instagram ?? null,
      website: contact?.website?.slice(0, 300) ?? null,
      price_cents: PRICING.service,
    })
    .select("id")
    .single();
  if (error) {
    console.error("Falha ao adicionar à prospecção", error);
    return { message: "Não foi possível adicionar à lista. Tente de novo." };
  }
  revalidatePath(`/dashboard/prospeccao/${searchId}`);
  revalidatePath("/dashboard/prospeccao");
  redirect(clientPath(created.id));
}

const optional = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message ?? `Máximo de ${max} caracteres` })
    .transform((v) => v || null);

const prospectSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome do negócio" }).max(200),
  contact_name: optional(80),
  phone: optional(40).refine((v) => v === null || parseBrazilPhone(v) !== null, {
    error: "Telefone inválido. Use DDD + número, ex.: (85) 98207-8212",
  }),
  email: optional(200).refine((v) => v === null || z.email().safeParse(v).success, { error: "E-mail inválido" }),
  instagram: optional(80).transform((v) => (v ? instagramHandle(v) ?? v.replace(/^@/, "") : null)),
  status: z.enum(PROSPECT_STATUSES.map((s) => s.id) as [ProspectStatus, ...ProspectStatus[]]),
  price: z.string().transform((v, ctx) => {
    const cents = parsePriceCents(v);
    if (cents === "invalid") {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Ex.: 90 ou 1.200,00" });
      return z.NEVER;
    }
    return cents;
  }),
  proposal_note: optional(1000),
  notes: optional(2000),
});

export async function updateProspect(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = prospectSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values, message: "Confira os campos destacados." };
  }
  const { price, ...rest } = parsed.data;
  const supabase = await requireUser();
  const { error } = await supabase
    .from("prospects")
    .update({ ...rest, price_cents: price })
    .eq("id", id);
  if (error) {
    console.error("Falha ao salvar o cliente", error);
    return { message: "Não foi possível salvar. Tente de novo.", values };
  }
  revalidatePath(clientPath(id));
  revalidatePath("/dashboard/prospeccao");
  return { ok: true, message: "Cliente salvo." };
}

/** Ao mandar a proposta: marca o contato e, se ainda era novo, "Proposta enviada". */
export async function markProposalSent(id: string): Promise<void> {
  const supabase = await requireUser();
  await supabase.from("prospects").update({ contacted_at: new Date().toISOString() }).eq("id", id);
  await supabase.from("prospects").update({ status: "enviado" }).eq("id", id).eq("status", "novo");
  revalidatePath(clientPath(id));
  revalidatePath("/dashboard/prospeccao");
}

export async function deleteProspect(id: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { message: "Não foi possível remover." };
  revalidatePath("/dashboard/prospeccao");
  redirect("/dashboard/prospeccao");
}
