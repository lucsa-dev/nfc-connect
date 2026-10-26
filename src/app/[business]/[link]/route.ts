import { after } from "next/server";
import { redirectResponse, resolveRedirect, type LinkRepository } from "@/lib/redirect";
import { createAdminClient } from "@/lib/supabase/admin";

// Sempre dinâmico: cada acesso precisa ser contado.
export const dynamic = "force-dynamic";

function repository(): LinkRepository {
  const supabase = createAdminClient();
  return {
    async findActiveLink(businessSlug, linkSlug) {
      const { data, error } = await supabase
        .from("links")
        .select("id, business_id, url, type, pix_key, businesses!inner(slug, meta_pixel_id)")
        .eq("businesses.slug", businessSlug)
        .eq("slug", linkSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { businesses, ...link } = data;
      return { ...link, meta_pixel_id: businesses.meta_pixel_id };
    },
    async recordVisit(link, visit) {
      const { error } = await supabase
        .from("link_visits")
        .insert({ ...visit, link_id: link.id, business_id: link.business_id });
      if (error) console.error("Falha ao registrar acesso", error);
    },
  };
}

export async function GET(request: Request, ctx: RouteContext<"/[business]/[link]">) {
  const { business, link } = await ctx.params;

  const decision = await resolveRedirect({
    businessSlug: business,
    linkSlug: link,
    request,
    repo: repository(),
    ipSalt: process.env.IP_HASH_SALT ?? "",
  });

  if (decision.kind === "not_found") {
    return new Response("Link não encontrado ou desativado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Registra o acesso depois de enviar o redirecionamento (waitUntil na Vercel).
  after(decision.record);

  return redirectResponse(decision.location, decision.pixelId);
}
