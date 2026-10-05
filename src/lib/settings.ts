import "server-only";
import { siteConfig } from "@/lib/site-config";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SiteSettings {
  /** WhatsApp em E.164 (+55...) ou null */
  whatsapp: string | null;
}

/**
 * Configurações públicas do site, lidas no servidor.
 * Se o banco falhar, usa a variável de ambiente como reserva.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await createAdminClient().from("site_settings").select("whatsapp").maybeSingle();
    if (error) throw error;
    return { whatsapp: data?.whatsapp ?? (siteConfig.whatsapp ? `+${siteConfig.whatsapp}` : null) };
  } catch (error) {
    console.error("Falha ao ler configurações do site", error);
    return { whatsapp: siteConfig.whatsapp ? `+${siteConfig.whatsapp}` : null };
  }
}
