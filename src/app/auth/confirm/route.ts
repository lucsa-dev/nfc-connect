import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Link mágico do e-mail: troca o token pela sessão e abre a área do cliente.
 * O modelo "Magic Link" do Supabase aponta para cá com token_hash; o ?code=
 * cobre links gerados no fluxo PKCE (mesmo navegador que pediu o link).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const supabase = await createClient();

  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Link sem token") };

  const url = request.nextUrl.clone();
  url.search = "";
  if (error) {
    console.error("Link de acesso inválido", error.message);
    url.pathname = "/login";
    url.searchParams.set("erro", "link");
  } else {
    url.pathname = "/conta";
  }
  return NextResponse.redirect(url);
}
