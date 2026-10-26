export const LINK_TYPES = ["review", "pix", "wifi", "business_card", "other"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const LINK_TYPE_INFO: Record<
  LinkType,
  { label: string; product: string; urlHint: string }
> = {
  review: {
    label: "Avaliação",
    product: "Cartão de avaliação",
    urlHint: "Link de avaliação do Google (ex.: https://g.page/r/.../review)",
  },
  pix: {
    label: "Pix",
    product: "Cartão de pagamento Pix",
    urlHint:
      "Opcional: link de pagamento do banco. Se vazio, usamos a chave Pix abaixo.",
  },
  wifi: {
    label: "Wi-Fi",
    product: "Wi-Fi",
    urlHint: "",
  },
  business_card: {
    label: "Cartão de visita",
    product: "Cartão de visita",
    urlHint: "Instagram (@perfil) ou site (ex.: meusite.com.br)",
  },
  other: {
    label: "Outro",
    product: "Link personalizado",
    urlHint: "Qualquer URL http(s)",
  },
};
