import { describe, expect, it } from "vitest";
import { formatCep, normalizeCep, parseIbgeCities, parseViaCep, searchCities } from "@/lib/br-location";

describe("CEP", () => {
  it("normaliza e formata", () => {
    expect(normalizeCep("60.160-230")).toBe("60160230");
    expect(normalizeCep("6016023")).toBeNull();
    expect(formatCep("60160230")).toBe("60160-230");
    expect(formatCep("6016")).toBe("6016");
  });

  it("lê a resposta do ViaCEP", () => {
    expect(parseViaCep({ localidade: "Fortaleza", uf: "CE", logradouro: "Rua A", bairro: "Aldeota" })).toEqual({
      name: "Fortaleza",
      uf: "CE",
      street: "Rua A",
      district: "Aldeota",
    });
    expect(parseViaCep({ erro: true })).toBeNull();
    expect(parseViaCep({ erro: "true" })).toBeNull();
  });
});

describe("municípios", () => {
  const cities = parseIbgeCities([
    { "municipio-nome": "Fortaleza", "UF-sigla": "CE" },
    { "municipio-nome": "Fortaleza dos Valos", "UF-sigla": "RS" },
    { "municipio-nome": "Nova Fortaleza", "UF-sigla": "XX" },
    { "municipio-nome": "São Paulo", "UF-sigla": "SP" },
    { "municipio-nome": "São Paulo das Missões", "UF-sigla": "RS" },
    { "municipio-nome": "Caucaia", "UF-sigla": "CE" },
    {},
  ]);

  it("ignora registros incompletos", () => {
    expect(cities).toHaveLength(6);
  });

  it("busca sem acento, priorizando quem começa com o texto", () => {
    expect(searchCities(cities, "fortal").map((c) => `${c.name}-${c.uf}`)).toEqual([
      "Fortaleza-CE",
      "Fortaleza dos Valos-RS",
      "Nova Fortaleza-XX",
    ]);
    expect(searchCities(cities, "sao pa")[0]).toEqual({ name: "São Paulo", uf: "SP" });
  });

  it("exige pelo menos 2 letras e respeita o limite", () => {
    expect(searchCities(cities, "f")).toEqual([]);
    expect(searchCities(cities, "fortaleza", 1)).toHaveLength(1);
  });
});
