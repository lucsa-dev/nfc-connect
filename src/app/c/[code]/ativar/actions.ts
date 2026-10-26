"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeCode } from "@/lib/cards";
import { analyzeSnapshot, collectProfiles, fetchPlaceProfile, metricsEnabled, saveSnapshot, storeProfiles } from "@/lib/google";
import { businessSlugCandidates, mapsQueryOf } from "@/lib/leads";
import { normalizeGoogleReviewUrl, PLACE_ID_PATTERN, reviewUrl, type PlaceProfile } from "@/lib/places";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivationResult = { ok: false; message: string };

/** Negócio escolhido na busca do Google (com a Places API) ou cadastrado à mão. */
export type ActivationInput =
  | { placeId: string }
  | { manual: { name: string; city: string; state: string | null; reviewUrl: string } };

const manualSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().max(2).nullable(),
  reviewUrl: z.string().max(1000),
});

type Admin = ReturnType<typeof createAdminClient>;

async function createBusiness(
  supabase: Admin,
  fields: {
    owner_id: string;
    name: string;
    city: string | null;
    place_id: string | null;
    maps_query?: string | null;
    description: string | null;
  },
) {
  const { city, ...row } = fields;
  for (const slug of businessSlugCandidates(row.name, city)) {
    const { data, error } = await supabase.from("businesses").insert({ ...row, slug }).select("id").single();
    if (!error) return data.id;
    if (error.code !== "23505") break;
  }
  return null;
}

/** Link de avaliação do negócio: "avaliacao" ou, se já existir, com o código da peça. */
async function createReviewLink(supabase: Admin, businessId: string, url: string, code: string) {
  for (const slug of ["avaliacao", `avaliacao-${code}`]) {
    const { data, error } = await supabase
      .from("links")
      .insert({ business_id: businessId, name: "Avaliação no Google", slug, type: "review", url })
      .select("id")
      .single();
    if (!error) return data.id;
    if (error.code !== "23505") {
      console.error("Falha ao criar link de avaliação", error);
      break;
    }
  }
  return null;
}

/**
 * Ativa uma peça em branco: qualquer pessoa com a peça em mãos pode ativar.
 * Vira um negócio do dono do lote (ou reaproveita o mesmo lugar do Google /
 * o mesmo link de avaliação), e a peça passa a apontar para o negócio.
 */
export async function activateCard(rawCode: string, input: ActivationInput): Promise<ActivationResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: "Cartão inválido." };

  const supabase = createAdminClient();
  const { data: card } = await supabase
    .from("cards")
    .select("id, owner_id, business_id")
    .eq("code", code)
    .maybeSingle();
  if (!card) return { ok: false, message: "Cartão não encontrado." };
  if (card.business_id) redirect(`/c/${code}/ativar`);

  let businessId: string | null = null;
  let createdBusiness = false;
  let destination: string;
  let profile: PlaceProfile | null = null;
  // Sem Place ID: busca no Maps por "Nome, Cidade - UF" (scraper da Apify), depois da resposta.
  let mapsQuery: string | null = null;
  let businessName = "";

  if ("placeId" in input) {
    // Busca de novo no servidor: não confia nos dados vindos do navegador.
    if (!PLACE_ID_PATTERN.test(input.placeId)) return { ok: false, message: "Negócio inválido." };
    profile = await fetchPlaceProfile(input.placeId);
    if (!profile) return { ok: false, message: "Não conseguimos buscar esse negócio no Google. Tente de novo." };
    destination = reviewUrl(profile.placeId);

    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", card.owner_id)
      .eq("place_id", profile.placeId)
      .maybeSingle();
    businessId = existing?.id ?? null;
    if (!businessId) {
      businessId = await createBusiness(supabase, {
        owner_id: card.owner_id,
        name: profile.name.trim().slice(0, 120),
        city: profile.city,
        place_id: profile.placeId,
        description: profile.address,
      });
      createdBusiness = Boolean(businessId);
    }
  } else {
    const parsed = manualSchema.safeParse(input.manual);
    if (!parsed.success) return { ok: false, message: "Preencha o nome e a cidade do negócio." };
    const url = normalizeGoogleReviewUrl(parsed.data.reviewUrl);
    if (!url) return { ok: false, message: "Cole o link de avaliação do Google (começa com g.page ou maps.app.goo.gl)." };
    destination = url;

    // Mesmo link de avaliação = mesmo negócio (outra peça do mesmo kit).
    const { data: existing } = await supabase
      .from("links")
      .select("business_id, businesses!inner(owner_id)")
      .eq("url", url)
      .eq("businesses.owner_id", card.owner_id)
      .limit(1)
      .maybeSingle();
    businessId = existing?.business_id ?? null;
    if (!businessId) {
      const { name, city, state } = parsed.data;
      businessName = name;
      const place = state ? `${city} - ${state}` : city;
      mapsQuery = mapsQueryOf(name, city, state);
      businessId = await createBusiness(supabase, {
        owner_id: card.owner_id,
        name,
        city,
        place_id: null,
        maps_query: mapsQuery,
        description: place,
      });
      createdBusiness = Boolean(businessId);
    }
  }
  if (!businessId) return { ok: false, message: "Não foi possível cadastrar o negócio. Fale com a TopTap." };

  // As peças do mesmo negócio compartilham o link de avaliação.
  const { data: existingLink } = await supabase
    .from("links")
    .select("id")
    .eq("business_id", businessId)
    .eq("type", "review")
    .eq("url", destination)
    .limit(1)
    .maybeSingle();
  let createdLinkId: string | null = null;
  if (!existingLink) {
    createdLinkId = await createReviewLink(supabase, businessId, destination, code);
    if (!createdLinkId) {
      if (createdBusiness) await supabase.from("businesses").delete().eq("id", businessId);
      return { ok: false, message: "Não foi possível ativar o cartão. Tente de novo." };
    }
  }

  // Só ativa se ninguém ativou no meio do caminho. Fica no automático: vai
  // direto para a avaliação enquanto for o único link do negócio.
  const { data: claimed } = await supabase
    .from("cards")
    .update({ business_id: businessId, activated_at: new Date().toISOString() })
    .eq("id", card.id)
    .is("business_id", null)
    .select("id");
  if (!claimed?.length) {
    if (createdLinkId) await supabase.from("links").delete().eq("id", createdLinkId);
    if (createdBusiness) await supabase.from("businesses").delete().eq("id", businessId);
    redirect(`/c/${code}/ativar`);
  }

  // Métricas do Google: com a Places API já temos o perfil; sem ela, o scraper
  // (Apify) busca pelo nome e cidade depois da resposta (leva de 30 s a 2 min).
  // Num negócio já existente (2ª peça), só coleta se não houver coleta do dia.
  if (!profile && mapsQuery && createdBusiness && metricsEnabled()) {
    const target = { businessId, name: businessName, placeId: null, query: mapsQuery };
    after(async () => storeProfiles(supabase, [target], await collectProfiles([target]), { analyze: true }));
  }
  if (profile) {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = createdBusiness
      ? { count: 0 }
      : await supabase
          .from("place_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", since);
    if (!count) {
      const snapshotId = await saveSnapshot(supabase, businessId, profile);
      const saved = profile;
      if (snapshotId) after(() => analyzeSnapshot(supabase, snapshotId, saved));
    }
  }

  redirect(`/c/${code}/ativar`);
}
