import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { createAdminClient } from "@/lib/supabase/admin";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { getSiteUrl } from "@/lib/urls";

/**
 * Acesso do cliente (dono do negócio) à área /conta, por link mágico no e-mail.
 * O primeiro membro de um negócio entra ativo; quem chega depois fica
 * "pending" até o administrador aprovar no painel.
 */

type Admin = ReturnType<typeof createAdminClient>;

/** Destino do link mágico: /auth/confirm troca o token pela sessão e abre a área do cliente. */
export const ACCESS_PATH = "/conta";

/** Id do login com este e-mail, criando o login se ainda não existe. */
async function ensureUser(supabase: Admin, email: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (data.user) return data.user.id;
  if (error && error.code !== "email_exists") {
    console.error("Falha ao criar o login do cliente", error);
    return null;
  }
  const { data: id } = await supabase.rpc("user_id_by_email", { target: email });
  return id ?? null;
}

export async function addMember(
  supabase: Admin,
  input: { businessId: string; email: string; phone: string | null },
): Promise<"active" | "pending" | null> {
  const userId = await ensureUser(supabase, input.email);
  if (!userId) return null;

  const { data: members } = await supabase.from("business_members").select("user_id, status").eq("business_id", input.businessId);
  const current = members?.find((m) => m.user_id === userId);
  const status = current?.status === "active" || !members?.some((m) => m.status === "active") ? "active" : "pending";

  const { error } = await supabase
    .from("business_members")
    .upsert({ business_id: input.businessId, user_id: userId, email: input.email, phone: input.phone, status });
  if (error) {
    console.error("Falha ao cadastrar o membro do negócio", error);
    return null;
  }
  return status;
}

/**
 * Envia o link de acesso pelo e-mail do Supabase Auth. O modelo "Magic Link"
 * precisa apontar para /auth/confirm com o token_hash (ver "Acesso do cliente" no README).
 */
export async function sendAccessLink(email: string): Promise<boolean> {
  const auth = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth;
  const { error } = await auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${getSiteUrl()}${ACCESS_PATH}` },
  });
  if (error) console.error("Falha ao enviar o link de acesso", { email, code: error.code, message: error.message });
  return !error;
}
