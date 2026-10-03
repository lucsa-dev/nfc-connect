import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseSecretKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Cliente com a chave secreta: ignora RLS. Usado apenas nas rotas públicas
 * (redirecionamento e página Pix), que não têm usuário logado.
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
