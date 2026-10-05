"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { normalizeBrPhone } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = String(formData.get("whatsapp") ?? "").trim();
  const whatsapp = raw ? normalizeBrPhone(raw) : null;
  if (raw && !whatsapp) {
    return { fieldErrors: { whatsapp: ["Número inválido. Use DDD + número, ex.: (85) 98207-8212"] }, values: { whatsapp: raw } };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  const { error } = await supabase.from("site_settings").upsert({ id: true, whatsapp });
  if (error) return { message: "Não foi possível salvar.", values: { whatsapp: raw } };

  // Landing e quiz são estáticos: regenera com o número novo.
  revalidatePath("/", "layout");
  return { ok: true, message: whatsapp ? "WhatsApp atualizado." : "Botão do WhatsApp desativado." };
}
