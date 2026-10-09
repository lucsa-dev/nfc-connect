import type { PlaceProfile } from "@/lib/places";

/**
 * Checklist do perfil no Google Maps, com regras fixas (sem IA).
 * Serve de base para a conversa de venda do serviço de otimização.
 */

export interface ProfileCheck {
  id: string;
  label: string;
  ok: boolean;
  /** O que fazer quando não está ok. */
  tip: string;
  weight: number;
}

const DAY = 86_400_000;

export function profileChecks(profile: PlaceProfile, now = new Date()): ProfileCheck[] {
  const replies = profile.ownerReplies;
  // Só avalia a resposta do dono com dados do scraper e ao menos 3 avaliações recentes.
  const repliesCheck: ProfileCheck[] =
    replies && replies.total >= 3
      ? [
          {
            id: "replies",
            label: "Responde as avaliações",
            ok: replies.replied / replies.total >= 0.5,
            tip: `Respondeu ${replies.replied} de ${replies.total} avaliações recentes. Responder todas (inclusive as negativas) melhora o ranking e a confiança.`,
            weight: 2,
          },
        ]
      : [];
  const rating = profile.rating ?? 0;
  const reviews = profile.reviews ?? 0;
  const lastReview = profile.lastReviewAt ? Date.parse(profile.lastReviewAt) : NaN;
  const recent = Number.isFinite(lastReview) && now.getTime() - lastReview <= 30 * DAY;

  return [
    {
      id: "rating",
      label: "Nota 4,5 ou mais",
      ok: reviews > 0 && rating >= 4.5,
      tip: "Peça avaliações aos clientes satisfeitos para subir a média.",
      weight: 3,
    },
    {
      id: "reviews",
      label: "100 avaliações ou mais",
      ok: reviews >= 100,
      tip: "Volume de avaliações pesa no ranking local. Use a placa no balcão e o cartão na entrega.",
      weight: 3,
    },
    {
      id: "recent",
      label: "Avaliação nos últimos 30 dias",
      ok: recent,
      tip: "O Google valoriza avaliações recentes. Mantenha um fluxo constante.",
      weight: 2,
    },
    {
      id: "photos",
      label: "10 fotos ou mais",
      ok: profile.photos >= 10,
      tip: "Adicione fotos da fachada, do interior, da equipe e dos produtos.",
      weight: 2,
    },
    {
      id: "hours",
      label: "Horário de funcionamento",
      ok: profile.hours.length > 0,
      tip: "Cadastre o horário (e os feriados) para aparecer em buscas como “aberto agora”.",
      weight: 2,
    },
    {
      id: "phone",
      label: "Telefone",
      ok: Boolean(profile.phone),
      tip: "Cadastre um telefone ou WhatsApp para o botão “Ligar”.",
      weight: 1,
    },
    {
      id: "website",
      label: "Site ou rede social",
      ok: Boolean(profile.website),
      tip: "Coloque um site, cardápio ou Instagram no campo “Site”.",
      weight: 1,
    },
    {
      id: "category",
      label: "Categoria definida",
      ok: Boolean(profile.category),
      tip: "Escolha a categoria principal mais específica possível.",
      weight: 1,
    },
    {
      id: "open",
      label: "Negócio aberto no Google",
      ok: !profile.businessStatus || profile.businessStatus === "OPERATIONAL",
      tip: "O Google mostra o negócio como fechado. Corrija o status no Perfil da Empresa.",
      weight: 3,
    },
    ...repliesCheck,
  ];
}

/** Nota de 0 a 100, ponderada pelos itens do checklist. */
export function profileScore(checks: ProfileCheck[]): number {
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const done = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  return total ? Math.round((done / total) * 100) : 0;
}
