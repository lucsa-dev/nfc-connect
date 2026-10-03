import type { FieldErrors } from "@/lib/validation";

/** Estado retornado pelas Server Actions para useActionState. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  /** Valores enviados, para repreencher o formulário após erro. */
  values?: Record<string, string>;
}

export const initialActionState: ActionState = {};

/** Traduz erros comuns do Postgres/Supabase em mensagens amigáveis. */
export function databaseErrorState(
  error: { code?: string; message: string },
  values?: Record<string, string>,
): ActionState {
  if (error.code === "23505") {
    return {
      message: "Esse endereço já está em uso. Escolha outro.",
      fieldErrors: { slug: ["Endereço já em uso"] },
      values,
    };
  }
  return { message: "Não foi possível salvar. Tente novamente.", values };
}
