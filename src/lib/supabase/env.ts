function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

// Acessos explícitos para que o Next.js injete as NEXT_PUBLIC_* no browser.
export const supabaseUrl = () =>
  required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = () =>
  required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

/** Chave secreta (sb_secret_... ou service_role). Somente no servidor. */
export const supabaseSecretKey = () =>
  required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
