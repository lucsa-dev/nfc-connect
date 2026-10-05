/** Dados de contato exibidos na landing. Configure pelas variáveis de ambiente. */
export const siteConfig = {
  name: "TopTap",
  /** Número com DDI e DDD, só dígitos. Ex.: 5511999998888 */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM?.replace(/^@/, "") || null,
};

export const DEFAULT_CONTACT_MESSAGE =
  "Olá! Quero saber mais sobre a placa TopTap de avaliação no Google para o meu negócio.";

/** Link de contato: WhatsApp > e-mail > null (sem contato configurado). */
export function contactHref(
  message = DEFAULT_CONTACT_MESSAGE,
  config: Pick<typeof siteConfig, "whatsapp" | "email"> = siteConfig,
): string | null {
  if (config.whatsapp) return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`;
  if (config.email)
    return `mailto:${config.email}?subject=${encodeURIComponent("Cartão TopTap")}&body=${encodeURIComponent(message)}`;
  return null;
}

/** Link do WhatsApp para um número em E.164 (+55...) com mensagem pronta. */
export function whatsappHref(number: string, message = DEFAULT_CONTACT_MESSAGE): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
