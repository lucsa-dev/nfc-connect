import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DiagnosticItem {
  label: string;
  ok: boolean;
  detail: string;
}

/** Tipo da chave pelo prefixo, sem revelar o valor. */
export function describeSecretKey(key: string | undefined): { ok: boolean; detail: string } {
  if (!key) return { ok: false, detail: "Não definida. Cadastre SUPABASE_SECRET_KEY na Vercel (Secret)." };
  if (key.startsWith("sb_publishable_"))
    return { ok: false, detail: "Está com a chave publicável. Use a chave secreta (sb_secret_...) ou a service_role." };
  if (key.startsWith("sb_secret_")) return { ok: true, detail: "Chave secreta (sb_secret_...)." };
  if (key.startsWith("eyJ")) return { ok: true, detail: "Chave JWT legada (confira se é a service_role, não a anon)." };
  return { ok: false, detail: "Formato não reconhecido. Confira se copiou a chave inteira." };
}

/** Verifica as integrações do servidor (para a tela de Configurações). */
export async function runDiagnostics(): Promise<DiagnosticItem[]> {
  const key = describeSecretKey(process.env.SUPABASE_SECRET_KEY);
  const items: DiagnosticItem[] = [{ label: "Chave secreta do Supabase", ...key }];

  try {
    const { error } = await createAdminClient().from("leads").select("id", { count: "exact", head: true });
    items.push({
      label: "Gravação de pedidos do quiz",
      ok: !error,
      detail: error ? `Erro ${error.code || ""}: ${error.message}`.trim() : "Conexão com a tabela de pedidos funcionando.",
    });
  } catch (error) {
    items.push({ label: "Gravação de pedidos do quiz", ok: false, detail: error instanceof Error ? error.message : "Erro desconhecido" });
  }

  items.push({
    label: "Busca no Google (Places API)",
    ok: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    detail: process.env.GOOGLE_PLACES_API_KEY ? "Chave definida." : "Sem chave: o quiz pede nome e cidade manualmente.",
  });
  return items;
}
