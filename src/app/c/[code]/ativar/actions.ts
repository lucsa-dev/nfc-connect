"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apifyEnabled } from "@/lib/apify";
import { normalizeCode } from "@/lib/cards";
import { analyzeSnapshot, collectProfiles, fetchPlaceProfile, metricsEnabled, saveSnapshot, storeProfiles } from "@/lib/google";
import { businessSlugCandidates, mapsQueryOf } from "@/lib/leads";
import { defaultSearchTerm } from "@/lib/market";
import { startReport } from "@/lib/market-server";
import { addMember, sendAccessLink } from "@/lib/members";
import { normalizeGoogleReviewUrl, PLACE_ID_PATTERN, reviewUrl, type PlaceProfile } from "@/lib/places";
import { normalizeBrPhone } from "@/lib/quiz";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivationResult = { ok: false; message: string };

/** Negócio escolhido na busca do Google (com a Places API) ou cadastrado à mão. */
export type ActivationInput =
  | { placeId: string }
  | { manual: { name: string; city: string; state: string | null; reviewUrl: string } };

/** Dono do negócio: recebe o link de acesso à área /conta (relatórios mensais). */
export interface ActivationOwner {
  email: string;
  whatsapp: string;
  /** O que o cliente digita no Google para achar o negócio (busca do relatório). */
  term?: string;
}

const ownerSchema = z.object({
  email: z.email({ error: "Confira o e-mail." }).max(320),
  whatsapp: z.string().transform((v, ctx) => {
    const phone = normalizeBrPhone(v);
    if (!phone) ctx.addIssue({ code: "custom", message: "Confira o WhatsApp com DDD." });
    return phone ?? "";
  }),
});

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
export async function activateCard(rawCode: string, input: ActivationInput, rawOwner: ActivationOwner): Promise<ActivationResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: "Cartão inválido." };
  const ownerParsed = ownerSchema.safeParse(rawOwner);
  if (!ownerParsed.success) return { ok: false, message: ownerParsed.error.issues[0]?.message ?? "Confira o e-mail e o WhatsApp." };
  const owner = { email: ownerParsed.data.email.toLowerCase(), phone: ownerParsed.data.whatsapp };

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

  // A peça vale um ano: começa ou renova o plano (relatório mensal) e traz os
  // relatórios feitos na prospecção para o negócio.
  const planExpiresAt = new Date();
  planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1);
  const { data: planned } = await supabase
    .from("businesses")
    .update({ plan_expires_at: planExpiresAt.toISOString() })
    .eq("id", businessId)
    .select("place_id")
    .single();
  if (planned?.place_id) {
    await supabase.from("market_reports").update({ business_id: businessId }).eq("place_id", planned.place_id).is("business_id", null);
  }

  // Sem relatório anterior o mensal não tem busca para repetir: o primeiro sai
  // agora, com o termo que o dono confirmou (ou o sugerido pela categoria e pelo
  // nome) e a cidade do perfil ("padaria" em "Fortaleza - CE"). Os mensais
  // repetem esse termo. O cron dos relatórios finaliza a coleta na rodada seguinte.
  const chosenTerm = rawOwner.term?.trim().replace(/\s+/g, " ") ?? "";
  const term = chosenTerm.length >= 2 ? chosenTerm : defaultSearchTerm(profile?.category, profile?.name);
  const area = [profile?.city, profile?.state].filter(Boolean).join(" - ");
  if (profile && apifyEnabled() && term.length >= 2 && area.length >= 2) {
    const reportBusinessId = businessId;
    const reportProfile = profile;
    after(async () => {
      const { count } = await supabase
        .from("market_reports")
        .select("id", { count: "exact", head: true })
        .eq("business_id", reportBusinessId)
        .neq("status", "failed");
      if (count) return;
      await startReport(supabase, {
        businessId: reportBusinessId,
        placeId: reportProfile.placeId,
        name: reportProfile.name,
        term: term.slice(0, 80),
        area: area.slice(0, 120),
        ownerId: card.owner_id,
      }).catch((error) => console.error("Falha ao iniciar o primeiro relatório", reportBusinessId, error));
    });
  }

  // Acesso do dono à área /conta: o link segue por e-mail depois da resposta.
  // Se o negócio já tem um dono cadastrado, este fica aguardando a aprovação da TopTap.
  after(async () => {
    const status = await addMember(supabase, { businessId, ...owner });
    if (status === "active") await sendAccessLink(owner.email);
  });

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

  redirect(`/c/${code}/ativar?acesso=1`);
}
