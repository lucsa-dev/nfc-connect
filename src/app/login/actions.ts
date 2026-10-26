"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { sendAccessLink } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, formDataToObject, loginSchema } from "@/lib/validation";

/** Só aceita destinos internos do painel (evita open redirect). */
function safeNext(value: string | undefined): string {
  return value && /^\/dashboard(\/[\w-]*)*$/.test(value) ? value : "/dashboard";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "E-mail ou senha inválidos.", values: { email: values.email ?? "" } };

  redirect(safeNext(values.next));
}

const emailSchema = z.object({ email: z.email({ error: "E-mail inválido" }) });

/**
 * Link de acesso por e-mail (dono do negócio). Só envia para quem já tem login,
 * mas a resposta é sempre a mesma, para não revelar quais e-mails existem.
 */
export async function sendLoginLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = emailSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const { data: userId } = await createAdminClient().rpc("user_id_by_email", { target: parsed.data.email });
  if (userId) await sendAccessLink(parsed.data.email);
  return { ok: true, message: "Se este e-mail tiver acesso, o link chega em alguns minutos. Confira também o spam." };
}
