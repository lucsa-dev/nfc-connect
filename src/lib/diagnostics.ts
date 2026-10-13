import "server-only";
import { autocompleteBody, PLACES_BASE } from "@/lib/places";
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

  // As rotas públicas (quiz, links, ativação dos cartões) usam a chave secreta.
  const tables = [
    { table: "leads", label: "Gravação de pedidos do quiz", ok: "Conexão com a tabela de pedidos funcionando." },
    { table: "cards", label: "Links dos cartões em branco (/c/...)", ok: "Conexão com a tabela de peças funcionando." },
  ] as const;
  for (const t of tables) {
    try {
      const { error } = await createAdminClient().from(t.table).select("id", { count: "exact", head: true });
      items.push({ label: t.label, ok: !error, detail: error ? `Erro ${error.code || ""}: ${error.message}`.trim() : t.ok });
    } catch (error) {
      items.push({ label: t.label, ok: false, detail: error instanceof Error ? error.message : "Erro desconhecido" });
    }
  }

  const env = (name: string, ok: string, missing: string, required = true): DiagnosticItem => ({
    label: name,
    ok: Boolean(process.env[name]) || !required,
    detail: process.env[name] ? ok : missing,
  });
  items.push(
    env("APIFY_TOKEN", "Token definido: métricas do Google Maps pelo scraper.", "Sem token: sem métricas do Google, evolução e busca no quiz."),
    env("OPENAI_API_KEY", "Chave definida: análise do perfil com IA.", "Sem chave: o painel mostra só o checklist do perfil."),
    env("CRON_SECRET", "Definido: coleta semanal e webhook da Apify protegidos.", "Sem segredo: a coleta semanal não roda."),
  );
  items.push(await checkPlaces());
  return items;
}

/** Faz uma busca real na Places API (New): a chave pode existir e o Google recusar. */
async function checkPlaces(): Promise<DiagnosticItem> {
  const label = "GOOGLE_PLACES_API_KEY";
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return { label, ok: true, detail: "Opcional. Sem ela, o quiz busca pela Apify (botão Buscar) ou pede nome e cidade." };
  try {
    const res = await fetch(`${PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify(autocompleteBody("padaria", crypto.randomUUID())),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { label, ok: true, detail: "Chave funcionando: autocomplete do negócio no quiz e na ativação." };
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const hint =
      res.status === 403
        ? " Ative a \"Places API (New)\" e o faturamento no projeto do Google Cloud e confira as restrições da chave (sem restrição de HTTP referrer)."
        : "";
    return { label, ok: false, detail: `O Google recusou (${res.status}): ${body?.error?.message ?? res.statusText}.${hint}` };
  } catch (error) {
    return { label, ok: false, detail: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
