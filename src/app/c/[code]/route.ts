import { after } from "next/server";
import { resolveCard, type CardRepository } from "@/lib/cards";
import { redirectResponse } from "@/lib/redirect";
import { createAdminClient } from "@/lib/supabase/admin";

// Sempre dinâmico: cada acesso precisa ser contado.
export const dynamic = "force-dynamic";

function repository(): CardRepository {
  const supabase = createAdminClient();
  return {
    async findCard(code) {
      const { data, error } = await supabase
        .from("cards")
        .select("id, code, direct_link_id, business:businesses(slug, meta_pixel_id, links(id, business_id, url, type, pix_key, slug, is_active))")
        .eq("code", code)
        .maybeSingle();
      if (error) throw new Error(`${error.code} ${error.message}`);
      return data;
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

  let decision;
  try {
    decision = await resolveCard({
      code,
      request,
      repo: repository(),
      ipSalt: process.env.IP_HASH_SALT ?? "",
    });
  } catch (error) {
    // Sem isto a resposta era um 500 vazio (tela branca no celular).
    console.error("Falha ao buscar a peça", code, error);
    return new Response("Não foi possível abrir este cartão agora. Tente de novo em instantes.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
    });
  }

  if (decision.kind === "not_found") {
    return new Response("Cartão não encontrado ou desativado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Registra o acesso depois de enviar o redirecionamento (waitUntil na Vercel).
  if (decision.kind === "redirect") after(decision.record);

  // A ativação nunca passa pelo Pixel (a peça ainda não é de nenhum negócio) e a
  // página do negócio dispara o Pixel ela mesma.
  return redirectResponse(decision.location, decision.kind === "redirect" ? decision.pixelId : null);
}
