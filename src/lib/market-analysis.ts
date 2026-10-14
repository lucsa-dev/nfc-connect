import { z } from "zod";
import { clientPace, unansweredNegatives, type MarketData } from "@/lib/market";

/**
 * Comparação das avaliações do negócio com as dos concorrentes feita pela IA
 * (OpenAI Responses API). Aqui ficam o pedido e a leitura da resposta; a chamada
 * fica em src/lib/market-server.ts.
 */

export const marketAnalysisSchema = z.object({
  resumo: z.string(),
  elogios_concorrentes: z.array(z.object({ concorrente: z.string(), tema: z.string(), detalhe: z.string() })),
  reclamacoes: z.array(z.object({ tema: z.string(), detalhe: z.string() })),
  pontos_fortes: z.array(z.string()),
  respostas: z.array(z.object({ numero: z.number().int(), resposta: z.string() })),
  argumento_venda: z.string(),
});

export type MarketAnalysis = z.infer<typeof marketAnalysisSchema>;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "elogios_concorrentes", "reclamacoes", "pontos_fortes", "respostas", "argumento_venda"],
  properties: {
    resumo: { type: "string", description: "Em 2 ou 3 frases: como o negócio está em relação aos concorrentes e o principal caminho para subir." },
    elogios_concorrentes: {
      type: "array",
      description: "Até 4 coisas que os clientes elogiam nos concorrentes e quase não aparecem (ou são criticadas) no negócio.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["concorrente", "tema", "detalhe"],
        properties: {
          concorrente: { type: "string", description: "Nome do concorrente, como recebido." },
          tema: { type: "string", description: "Tema em até 4 palavras (ex.: atendimento rápido)." },
          detalhe: { type: "string", description: "1 frase comparando com o negócio." },
        },
      },
    },
    reclamacoes: {
      type: "array",
      description: "Até 4 reclamações recorrentes nas avaliações do negócio, da mais frequente para a menos.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tema", "detalhe"],
        properties: { tema: { type: "string" }, detalhe: { type: "string", description: "1 frase, com quantas vezes aparece se der." } },
      },
    },
    pontos_fortes: { type: "array", items: { type: "string" }, description: "Até 3 diferenciais do negócio que os clientes elogiam." },
    respostas: {
      type: "array",
      description: "Uma resposta educada e curta (até 3 frases) para cada avaliação negativa sem resposta, pelo número recebido.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["numero", "resposta"],
        properties: { numero: { type: "integer" }, resposta: { type: "string" } },
      },
    },
    argumento_venda: {
      type: "string",
      description: "Mensagem curta (até 3 frases) para o vendedor da TopTap mandar ao dono, usando os números da comparação.",
    },
  },
} as const;

const INSTRUCTIONS = `Você é especialista em reputação no Google Maps para pequenos negócios brasileiros.
A TopTap vende placas NFC que levam o cliente direto para a tela de avaliação no Google.
Compare as avaliações do negócio com as dos concorrentes da mesma busca e responda em português do Brasil, em linguagem simples.
Use só os dados recebidos: não invente números nem temas que não aparecem nos textos.
Se houver poucas avaliações com texto, diga isso no resumo e devolva listas curtas (ou vazias).
Nas respostas às avaliações negativas, agradeça, reconheça o problema sem discutir e convide o cliente a voltar ou a falar com o negócio. Não prometa o que não sabe.`;

const REVIEWS_PER_COMPETITOR = 10;
const COMPETITORS = 5;

export function marketAnalysisInput(data: MarketData) {
  const negatives = unansweredNegatives(data.client);
  const texts = (c: MarketData["client"], n: number) =>
    c.recent
      .filter((r) => r.text)
      .slice(0, n)
      .map((r) => ({ estrelas: r.stars, data: r.date?.slice(0, 10) ?? null, texto: r.text!.slice(0, 300) }));
  const payload = {
    busca: `${data.term} em ${data.area}`,
    negocio: {
      nome: data.client.name,
      posicao_na_busca: data.client.rank,
      nota: data.client.rating,
      avaliacoes: data.client.reviews,
      avaliacoes_por_mes: clientPace(data),
      avaliacoes_recentes: texts(data.client, 20),
    },
    negativas_sem_resposta: negatives.map((r, i) => ({ numero: i + 1, estrelas: r.stars, texto: r.text })),
    concorrentes: data.competitors.slice(0, COMPETITORS).map((c) => ({
      nome: c.name,
      posicao_na_busca: c.rank,
      nota: c.rating,
      avaliacoes: c.reviews,
      avaliacoes_por_mes: c.pace,
      avaliacoes_recentes: texts(c, REVIEWS_PER_COMPETITOR),
    })),
  };
  return `Dados (JSON):\n${JSON.stringify(payload, null, 2)}`;
}

export function marketAnalysisRequestBody(data: MarketData, model: string) {
  return {
    model,
    instructions: INSTRUCTIONS,
    input: marketAnalysisInput(data),
    text: { format: { type: "json_schema", name: "comparacao_concorrentes", strict: true, schema: JSON_SCHEMA } },
  };
}

export function readMarketAnalysis(value: unknown): MarketAnalysis | null {
  const parsed = marketAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
