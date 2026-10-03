import { z } from "zod";
import { LINK_TYPES } from "@/lib/link-types";
import { normalizePixKey } from "@/lib/pix";
import {
  isReservedBusinessSlug,
  isValidSlug,
  SLUG_MAX,
  SLUG_MIN,
  slugify,
} from "@/lib/slug";
import { normalizeDestinationUrl } from "@/lib/urls";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo de ${max} caracteres` })
    .optional()
    .transform((v) => (v ? v : null));

/** Slug informado ou, se vazio, derivado do nome. */
function slugField(fallbackFrom: string, value: string | undefined) {
  return value?.trim() ? value.trim().toLowerCase() : slugify(fallbackFrom);
}

const slugMessage = `Use de ${SLUG_MIN} a ${SLUG_MAX} caracteres: letras minúsculas, números e hífens`;

export const businessSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Informe o nome do negócio" }).max(120),
    slug: z.string().optional(),
    description: optionalText(500),
  })
  .transform((data) => ({ ...data, slug: slugField(data.name, data.slug) }))
  .superRefine((data, ctx) => {
    if (!isValidSlug(data.slug)) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: slugMessage });
    } else if (isReservedBusinessSlug(data.slug)) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: "Este endereço é reservado pelo sistema" });
    }
  });

export type BusinessInput = z.output<typeof businessSchema>;

const amountField = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > 999999.99) {
      ctx.addIssue({ code: "custom", message: "Valor inválido" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

export const linkSchema = z
  .object({
    name: z.string().trim().min(2, { error: "Informe o nome do link" }).max(120),
    slug: z.string().optional(),
    type: z.enum(LINK_TYPES, { error: "Tipo inválido" }),
    url: z.string().optional(),
    pix_key: optionalText(77),
    pix_name: optionalText(25),
    pix_city: optionalText(15),
    pix_amount: amountField,
    pix_description: optionalText(50),
    is_active: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
      .optional()
      .transform((v) => v === undefined || v === true || v === "on" || v === "true"),
  })
  .transform((data, ctx) => {
    const slug = slugField(data.name, data.slug);
    if (!isValidSlug(slug)) {
      ctx.addIssue({ code: "custom", path: ["slug"], message: slugMessage });
    }

    let url: string | null = null;
    if (data.url?.trim()) {
      url = normalizeDestinationUrl(data.url);
      if (!url) ctx.addIssue({ code: "custom", path: ["url"], message: "URL inválida" });
    }

    const isPix = data.type === "pix";
    let pixKey: string | null = null;
    if (isPix && data.pix_key) {
      pixKey = normalizePixKey(data.pix_key)?.key ?? null;
      if (!pixKey) {
        ctx.addIssue({
          code: "custom",
          path: ["pix_key"],
          message: "Chave inválida (CPF, CNPJ, e-mail, aleatória ou telefone com +55)",
        });
      }
    }

    const usesPixKey = isPix && !data.url?.trim();
    if (usesPixKey) {
      if (!data.pix_key)
        ctx.addIssue({ code: "custom", path: ["pix_key"], message: "Informe a chave Pix ou uma URL" });
      if (!data.pix_name)
        ctx.addIssue({ code: "custom", path: ["pix_name"], message: "Informe o nome do recebedor" });
      if (!data.pix_city)
        ctx.addIssue({ code: "custom", path: ["pix_city"], message: "Informe a cidade do recebedor" });
    } else if (!data.url?.trim()) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Informe a URL de destino" });
    }

    return {
      name: data.name,
      slug,
      type: data.type,
      url,
      is_active: data.is_active,
      pix_key: isPix ? pixKey : null,
      pix_name: isPix ? data.pix_name : null,
      pix_city: isPix ? data.pix_city : null,
      pix_amount: isPix ? data.pix_amount : null,
      pix_description: isPix ? data.pix_description : null,
    };
  });

export type LinkInput = z.output<typeof linkSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "E-mail inválido" }),
  password: z.string().min(6, { error: "Senha muito curta" }),
});

export type FieldErrors = Record<string, string[] | undefined>;

/** Converte FormData em objeto simples, ignorando arquivos e campos internos. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) result[key] = value;
  }
  return result;
}

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
