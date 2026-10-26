import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Consultas do painel. Todas passam pela sessão do usuário (RLS). */

export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.email as string | undefined) ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw error;
  return data;
}

/**
 * Negócios do dono logado (área /conta). Pelo RLS, os dados do negócio só vêm
 * quando a participação está ativa; pendente, chega só o status.
 */
export async function listMemberships() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return [];
  const { data, error } = await supabase
    .from("business_members")
    .select(
      `status, business:businesses(id, name, slug, plan_expires_at,
        links(id, name, type, slug, is_active, click_count),
        cards(id, code, visit_count, activated_at, batch:card_batches(product)),
        market_reports(id, token, term, area, created_at, data))`,
    )
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "businesses.links", ascending: true })
    .order("created_at", { referencedTable: "businesses.market_reports", ascending: false });
  if (error) throw error;
  return data;
}

export async function listBusinesses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, description, created_at, links(click_count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map(({ links, ...business }) => ({
    ...business,
    linkCount: links.length,
    clickCount: links.reduce((sum, l) => sum + Number(l.click_count), 0),
  }));
}

export async function getBusinessWithLinks(businessId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "*, links(*), cards(id, code, direct_link_id, visit_count, activated_at, batch:card_batches(product)), business_members(user_id, email, phone, status, created_at)",
    )
    .eq("id", businessId)
    .order("created_at", { referencedTable: "links", ascending: true })
    .order("activated_at", { referencedTable: "cards", ascending: true })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error; // 22P02: id não é UUID
  if (!data) notFound();
  return data;
}

export async function getLink(businessId: string, linkId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("links")
    .select("*, business:businesses(id, name, slug)")
    .eq("id", linkId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data || !data.business) notFound();
  return { ...data, business: data.business };
}

export const VISIT_COLUMNS =
  "created_at, source, ip_hash, user_agent, browser, browser_version, os, os_version, device_type, device_vendor, is_bot, language, referer, country, region, city, latitude, longitude" as const;

const PAGE_SIZE = 1000; // limite padrão de linhas por resposta da API do Supabase

/** Acessos de um link desde `since`, mais recentes primeiro (paginado). */
export async function getLinkVisits(linkId: string, since: Date, limit = 20000) {
  const supabase = await createClient();
  const rows = [];
  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, limit) - 1;
    const { data, error } = await supabase
      .from("link_visits")
      .select(VISIT_COLUMNS)
      .eq("link_id", linkId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    rows.push(...data);
    if (data.length < to - from + 1) break;
  }
  return rows;
}

// Pedidos (leads do quiz) -------------------------------------------------------

export const LEAD_STATUSES = ["lead", "quiz", "convertido", "descartado"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export async function listLeads(status: LeadStatus | null) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, status, step, place_name, place_city, place_state, contact_name, whatsapp, plaques, cards, stickers, total_cents, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function countLeadsByStatus() {
  const supabase = await createClient();
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  await Promise.all(
    LEAD_STATUSES.map(async (s) => {
      const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", s);
      counts[s] = count ?? 0;
    }),
  );
  return counts;
}

export async function getLead(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) notFound();
  return data;
}

// Lotes de peças em branco ------------------------------------------------------

export async function listBatches() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_batches")
    .select("id, name, product, style, quantity, created_at, cards(business_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map(({ cards, ...batch }) => ({
    ...batch,
    activated: cards.filter((c) => c.business_id).length,
  }));
}

export async function getBatch(batchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_batches")
    .select("*, cards(id, code, position, activated_at, visit_count, business:businesses(id, name))")
    .eq("id", batchId)
    .order("position", { referencedTable: "cards", ascending: true })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) notFound();
  return data;
}

// Google Maps ---------------------------------------------------------------------

/** Filtro das linhas com prazo (conteúdo da Places API): só as que ainda valem. */
export const notExpired = (now = new Date()) => `expires_at.is.null,expires_at.gt.${now.toISOString()}`;

/** Coletas do Google de um negócio, mais recentes primeiro. */
export async function getPlaceSnapshots(businessId: string, limit = 60) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_snapshots")
    .select("id, created_at, rating, reviews, profile, analysis, analyzed_at")
    .eq("business_id", businessId)
    .or(notExpired())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Nota e avaliações de todos os negócios nos últimos `days` dias (paginado). */
export async function listSnapshotPoints(days = 365, limit = 20000) {
  const since = new Date(Date.now() - days * 86_400_000);
  const supabase = await createClient();
  const rows = [];
  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, limit) - 1;
    const { data, error } = await supabase
      .from("place_snapshots")
      .select("business_id, created_at, rating, reviews")
      .gte("created_at", since.toISOString())
      .or(notExpired())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    rows.push(...data);
    if (data.length < to - from + 1) break;
  }
  return rows;
}

export async function listGoogleBusinesses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, place_id, created_at")
    .not("place_id", "is", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

// Relatórios de concorrência e prospecção -------------------------------------------

/** Relatório com o mapa de ranking mais recente que ainda não expirou. */
export async function getReport(reportId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_reports")
    .select("*, rank_grids(points, size, spacing_m, created_at, expires_at)")
    .eq("id", reportId)
    .gt("rank_grids.expires_at", new Date().toISOString())
    .order("created_at", { referencedTable: "rank_grids", ascending: false })
    .limit(1, { referencedTable: "rank_grids" })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) notFound();
  return data;
}

/** Relatórios de um negócio (pelo vínculo ou pelo mesmo Place ID), mais recentes primeiro. */
export async function listReports({ businessId, placeId }: { businessId?: string; placeId?: string | null }, limit = 10) {
  const supabase = await createClient();
  let query = supabase
    .from("market_reports")
    .select("id, name, term, area, status, data, created_at, business_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (businessId && placeId) query = query.or(`business_id.eq.${businessId},place_id.eq.${placeId}`);
  else if (businessId) query = query.eq("business_id", businessId);
  else query = query.is("business_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Relatório mais recente (que não falhou) de cada Place ID, para marcar na prospecção. */
export async function getLatestReportsByPlace(placeIds: string[]) {
  const reports = new Map<string, { id: string; status: string }>();
  if (!placeIds.length) return reports;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("market_reports")
    .select("id, place_id, status")
    .in("place_id", placeIds)
    .neq("status", "failed")
    .order("created_at", { ascending: false });
  if (error) throw error;
  for (const r of data) if (!reports.has(r.place_id)) reports.set(r.place_id, { id: r.id, status: r.status });
  return reports;
}

export async function listProspectSearches(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospect_searches")
    .select("id, term, area, status, created_at, results")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(({ results, ...s }) => ({ ...s, count: Array.isArray(results) ? results.length : 0 }));
}

export async function getProspectSearch(searchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospect_searches").select("*").eq("id", searchId).maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) notFound();
  return data;
}
