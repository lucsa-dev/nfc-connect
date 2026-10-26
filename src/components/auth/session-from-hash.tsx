"use client";

import { useEffect } from "react";

/**
 * Link mágico no modelo padrão do Supabase: depois de validar o token, o
 * Supabase volta para o site com a sessão no fragmento da URL
 * (#access_token=...&refresh_token=...), que nunca chega ao servidor. Este
 * componente fica no layout raiz porque o link pode cair em qualquer página
 * (/conta vira /login e o fragmento vai junto; sem URL liberada, cai em /).
 * Ele grava a sessão nos cookies e abre a área do cliente.
 *
 * O modelo da TopTap (supabase/templates/magic_link.html) usa /auth/confirm
 * com token_hash e não passa por aqui.
 */
export function SessionFromHash() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (hash.get("error_code") || hash.get("error")) {
      window.location.replace("/login?erro=link");
      return;
    }
    if (!accessToken || !refreshToken) return;

    // Carrega o cliente do Supabase só quando há sessão para gravar.
    void import("@/lib/supabase/client").then(async ({ createClient }) => {
      const { error } = await createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      window.location.replace(error ? "/login?erro=link" : "/conta");
    });
  }, []);

  return null;
}
