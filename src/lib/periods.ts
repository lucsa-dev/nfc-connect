export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

/** Lê ?dias= da URL; valores fora da lista caem no padrão de 30 dias. */
export function parsePeriod(value: string | string[] | undefined | null): Period {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

/** Início da janela: meia-noite (UTC) de `days - 1` dias atrás, com folga para o fuso. */
export function periodStart(days: number, now = new Date()): Date {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}
