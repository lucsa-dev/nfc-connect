import { after } from "next/server";
import { resolveCard, type CardRepository } from "@/lib/cards";
import { createAdminClient } from "@/lib/supabase/admin";

// Sempre dinâmico: cada acesso precisa ser contado.
export const dynamic = "force-dynamic";

function repository(): CardRepository {
  const supabase = createAdminClient();
  return {
    async findCard(code) {
      const { data, error } = await supabase
        .from("cards")
        .select("code, link:links(id, business_id, url, type, pix_key, is_active, slug, business:businesses(slug))")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const link = data.link;
      if (!link?.business) return { code: data.code, link: null };
      const { business, ...rest } = link;
      return { code: data.code, link: { ...rest, business_slug: business.slug } };
    },
    async recordVisit(link, visit) {
      const { error } = await supabase
        .from("link_visits")
        .insert({ ...visit, link_id: link.id, business_id: link.business_id });
      if (error) console.error("Falha ao registrar acesso", error);
    },
  };
}

export async function GET(request: Request, ctx: RouteContext<"/c/[code]">) {
  const { code } = await ctx.params;

  const decision = await resolveCard({
    code,
    request,
    repo: repository(),
    ipSalt: process.env.IP_HASH_SALT ?? "",
  });

  if (decision.kind === "not_found") {
    return new Response("Cartão não encontrado ou desativado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Registra o acesso depois de enviar o redirecionamento (waitUntil na Vercel).
  if (decision.kind === "redirect") after(decision.record);

  return new Response(null, {
    status: 302,
    headers: {
      Location: decision.location,
      // Sem cache: a peça muda de destino ao ser ativada e cada acesso é contado.
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
