"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { PRODUCTS, STYLES } from "@/lib/card";
import { BATCH_MAX, generateCode } from "@/lib/cards";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsOf, formDataToObject } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

const batchSchema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  quantity: z.coerce
    .number({ error: "Informe a quantidade" })
    .int("Use um número inteiro")
    .min(1, "Mínimo 1")
    .max(BATCH_MAX, `Máximo ${BATCH_MAX} por lote`),
  product: z.enum(PRODUCTS.map((p) => p.id) as [string, ...string[]], { error: "Escolha o produto" }),
  style: z.enum(STYLES.map((s) => s.id) as [string, ...string[]], { error: "Escolha o estilo" }),
});

/** Gera um lote de peças em branco, cada uma com seu código. */
export async function createBatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = batchSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const { quantity, product, style } = parsed.data;
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date());
  const name = parsed.data.name || `${PRODUCTS.find((p) => p.id === product)!.label} · ${date}`;

  const supabase = await requireUser();
  const { data: batch, error } = await supabase
    .from("card_batches")
    .insert({ name, product, style, quantity })
    .select("id")
    .single();
  if (error) return { message: "Não foi possível criar o lote.", values };

  // Colisão de código é improvável (31^8); se acontecer, sorteia de novo.
  let inserted = false;
  for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
    const codes = new Set<string>();
    while (codes.size < quantity) codes.add(generateCode());
    const { error: cardsError } = await supabase
      .from("cards")
      .insert([...codes].map((code, i) => ({ batch_id: batch.id, code, position: i + 1 })));
    if (!cardsError) inserted = true;
    else if (cardsError.code !== "23505") break;
  }
  if (!inserted) {
    await supabase.from("card_batches").delete().eq("id", batch.id);
    return { message: "Não foi possível gerar os códigos. Tente de novo.", values };
  }

  revalidatePath("/dashboard/cartoes");
  redirect(`/dashboard/cartoes/${batch.id}`);
}

/** Exclui um lote só se nenhuma peça foi ativada (senão as peças em uso parariam de funcionar). */
export async function deleteBatch(batchId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .not("link_id", "is", null);
  if (count) return { message: "Este lote tem peças ativadas e não pode ser excluído." };

  const { error } = await supabase.from("card_batches").delete().eq("id", batchId);
  if (error) return { message: "Não foi possível excluir o lote." };

  revalidatePath("/dashboard/cartoes");
  redirect("/dashboard/cartoes");
}
