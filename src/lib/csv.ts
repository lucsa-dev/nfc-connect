/** Escapa um valor para CSV (RFC 4180) e neutraliza injeção de fórmulas. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Evita que Excel/Sheets interpretem o conteúdo como fórmula.
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<keyof T & string>,
): string {
  const lines = [columns.map(escapeCsvValue).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escapeCsvValue(row[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}
