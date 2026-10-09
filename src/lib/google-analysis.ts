import { z } from "zod";
import { profileChecks, profileScore } from "@/lib/google-score";
import type { PlaceProfile } from "@/lib/places";

/**
 * Análise do perfil no Google Maps feita pela IA (OpenAI Responses API).
 * Aqui ficam só o pedido e a leitura da resposta, para poder testar;
 * a chamada fica em src/lib/google.ts (servidor).
 */

export const OPENAI_URL = "https://api.openai.com/v1/responses";
export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

export const analysisSchema = z.object({
  resumo: z.string(),
  nota: z.number().int().min(0).max(100),
  pontos_fortes: z.array(z.string()),
  melhorias: z.array(
    z.object({
      titulo: z.string(),
      detalhe: z.string(),
      impacto: z.enum(["alto", "medio", "baixo"]),
    }),
  ),
  argumento_venda: z.string(),
});

export type Analysis = z.infer<typeof analysisSchema>;

/** JSON Schema estrito (Structured Outputs): tudo obrigatório, nada além. */
const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "nota", "pontos_fortes", "melhorias", "argumento_venda"],
  properties: {
    resumo: { type: "string", description: "Diagnóstico em 2 ou 3 frases, linguagem simples." },
    nota: { type: "integer", description: "Nota de 0 a 100 para a força do perfil no Google Maps." },
    pontos_fortes: { type: "array", items: { type: "string" }, description: "Até 4 pontos positivos." },
    melhorias: {
      type: "array",
      description: "De 3 a 6 ações concretas, da mais para a menos importante.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "detalhe", "impacto"],
        properties: {
          titulo: { type: "string" },
          detalhe: { type: "string", description: "Como fazer, em 1 ou 2 frases." },
          impacto: { type: "string", enum: ["alto", "medio", "baixo"] },
        },
      },
    },
    argumento_venda: {
      type: "string",
      description: "Mensagem curta (até 3 frases) que a TopTap pode mandar ao dono oferecendo o serviço de otimização.",
    },
  },
} as const;

const INSTRUCTIONS = `Você é especialista em SEO local e no Perfil da Empresa no Google (Google Maps) para pequenos negócios brasileiros.
A TopTap vende placas e cartões NFC que levam o cliente direto para a tela de avaliação no Google, e também oferece o serviço de otimizar o perfil.
Analise os dados do perfil e responda em português do Brasil, com ações práticas que o dono consiga entender.
Use só os dados recebidos: não invente números. Campos nulos significam dado indisponível, não ausência.
Nas avaliações recentes, observe elogios e reclamações recorrentes e se o dono responde.`;

export function analysisInput(profile: PlaceProfile, now = new Date()) {
  const checks = profileChecks(profile, now);
  const data = {
    nome: profile.name,
    categoria: profile.category,
    tipos: profile.types,
    endereco: profile.address,
    cidade: profile.city && profile.state ? `${profile.city} - ${profile.state}` : profile.city,
    status: profile.businessStatus,
    nota: profile.rating,
    total_avaliacoes: profile.reviews,
    ultima_avaliacao: profile.lastReviewAt,
    site: profile.website,
    telefone: profile.phone,
    horario: profile.hours,
    fotos: profile.photosCapped && profile.photos >= 10 ? "10 ou mais" : profile.photos,
    respostas_do_dono: profile.ownerReplies
      ? `${profile.ownerReplies.replied} de ${profile.ownerReplies.total} avaliações recentes respondidas`
      : null,
    avaliacoes_por_estrela: profile.distribution
      ? Object.fromEntries(profile.distribution.map((n, i) => [`${i + 1}_estrela${i ? "s" : ""}`, n]))
      : null,
    resumo_do_google: profile.summary,
    faixa_de_preco: profile.priceLevel,
    avaliacoes_recentes: profile.sampleReviews,
    checklist: checks.map((c) => ({ item: c.label, ok: c.ok })),
    nota_checklist: profileScore(checks),
    data_da_analise: now.toISOString().slice(0, 10),
  };
  return `Dados do perfil (JSON):\n${JSON.stringify(data, null, 2)}`;
}

export function analysisRequestBody(profile: PlaceProfile, model: string, now = new Date()) {
  return {
    model,
    instructions: INSTRUCTIONS,
    input: analysisInput(profile, now),
    text: { format: { type: "json_schema", name: "analise_perfil_google", strict: true, schema: JSON_SCHEMA } },
  };
}

interface ResponsesApiResult {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
}

/** Lê o texto JSON da resposta da Responses API e valida o formato. */
export function parseAnalysisResponse(json: ResponsesApiResult): Analysis | null {
  const text = (json.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((c) => c.type === "output_text" && c.text)?.text;
  if (!text) return null;
  try {
    const parsed = analysisSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Valida uma análise salva no banco (coluna jsonb). */
export function readAnalysis(value: unknown): Analysis | null {
  const parsed = analysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
