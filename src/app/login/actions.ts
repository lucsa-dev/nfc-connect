"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
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
