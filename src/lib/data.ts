import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Consultas do painel. Todas passam pela sessão do usuário (RLS). */

export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.email as string | undefined) ?? null;
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
    .select("*, links(*)")
    .eq("id", businessId)
    .order("created_at", { referencedTable: "links", ascending: true })
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
    .select("id, status, step, place_name, place_city, place_state, contact_name, whatsapp, plaques, cards, total_cents, updated_at, created_at")
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
    .select("id, name, product, style, quantity, created_at, cards(link_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map(({ cards, ...batch }) => ({
    ...batch,
    activated: cards.filter((c) => c.link_id).length,
  }));
}

export async function getBatch(batchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_batches")
    .select("*, cards(id, code, position, activated_at, link_id, link:links(id, click_count, business:businesses(id, name)))")
    .eq("id", batchId)
    .order("position", { referencedTable: "cards", ascending: true })
    .maybeSingle();
  if (error && error.code !== "22P02") throw error;
  if (!data) notFound();
  return data;
}