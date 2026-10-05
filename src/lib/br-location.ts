/** CEP (ViaCEP) e municípios (IBGE): leitura das respostas e busca por nome. */

export interface City {
  name: string;
  uf: string;
}

/** "60.160-230" -> "60160230" (ou null se não tiver 8 dígitos). */
export function normalizeCep(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

export function formatCep(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

interface ViaCepResponse {
  erro?: boolean | string;
  localidade?: string;
  uf?: string;
  logradouro?: string;
  bairro?: string;
}

export interface CepInfo extends City {
  street: string | null;
  district: string | null;
}

export function parseViaCep(json: ViaCepResponse): CepInfo | null {
  if (!json || json.erro || !json.localidade || !json.uf) return null;
  return {
    name: json.localidade,
    uf: json.uf,
    street: json.logradouro || null,
    district: json.bairro || null,
  };
}

/** Resposta do IBGE em `?view=nivelado`. */
export function parseIbgeCities(json: Array<Record<string, unknown>>): City[] {
  return json
    .map((m) => ({ name: String(m["municipio-nome"] ?? ""), uf: String(m["UF-sigla"] ?? "") }))
    .filter((c) => c.name && c.uf);
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Busca cidades pelo nome, sem acento. Quem começa com o texto vem antes;
 * entre elas, as capitais e os nomes mais curtos.
 */
export function searchCities(cities: City[], query: string, limit = 8): City[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const scored: Array<{ city: City; score: number }> = [];
  for (const city of cities) {
    const name = fold(city.name);
    const label = `${name} ${city.uf.toLowerCase()}`;
    let score: number;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 2;
    else if (label.includes(q)) score = 3;
    else continue;
    scored.push({ city, score: score * 1000 + name.length });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name, "pt-BR"))
    .slice(0, limit)
    .map((s) => s.city);
}
