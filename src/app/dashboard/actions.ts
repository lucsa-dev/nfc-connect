"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { databaseErrorState, type ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { businessSchema, fieldErrorsOf, formDataToObject, linkSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return supabase;
}

// Negócios -----------------------------------------------------------------

export async function createBusiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = businessSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { data, error } = await supabase.from("businesses").insert(parsed.data).select("id").single();
  if (error) return databaseErrorState(error, values);

  revalidatePath("/dashboard");
  redirect(`/dashboard/${data.id}`);
}

export async function updateBusiness(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = businessSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", businessId);
  if (error) return databaseErrorState(error, values);

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Negócio atualizado." };
}

export async function deleteBusiness(businessId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase.from("businesses").delete().eq("id", businessId);
  if (error) return { message: "Não foi possível excluir o negócio." };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Links --------------------------------------------------------------------

export async function createLink(
  businessId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = linkSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase.from("links").insert({ ...parsed.data, business_id: businessId });
  if (error) return databaseErrorState(error, values);

  revalidatePath(`/dashboard/${businessId}`);
  return { ok: true, message: "Link criado." };
}

export async function updateLink(
  businessId: string,
  linkId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formDataToObject(formData);
  const parsed = linkSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await requireUser();
  const { error } = await supabase
    .from("links")
    .update(parsed.data)
    .eq("id", linkId)
    .eq("business_id", businessId);
  if (error) return databaseErrorState(error, values);

  revalidatePath(`/dashboard/${businessId}`, "layout");
  return { ok: true, message: "Link atualizado." };
}

export async function deleteLink(businessId: string, linkId: string): Promise<ActionState> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("links")
    .delete()
    .eq("id", linkId)
    .eq("business_id", businessId);
  if (error) return { message: "Não foi possível excluir o link." };

  revalidatePath(`/dashboard/${businessId}`);
  redirect(`/dashboard/${businessId}`);
}
