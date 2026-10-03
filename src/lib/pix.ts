/**
 * Geração do "Pix Copia e Cola" (BR Code estático) conforme o
 * Manual de Padrões para Iniciação do Pix (Banco Central), formato EMV-MPM.
 */

export interface PixPayloadInput {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount?: number | null;
  description?: string | null;
  txid?: string | null;
}

export type PixKeyType = "cpf" | "cnpj" | "phone" | "email" | "random";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF), exigido pelo BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(payload);
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Campo EMV: ID (2) + tamanho (2) + valor. */
export function emv(id: string, value: string): string {
  const size = new TextEncoder().encode(value).length;
  if (size > 99) throw new Error(`Campo ${id} excede 99 bytes`);
  return `${id}${String(size).padStart(2, "0")}${value}`;
}

/** Remove acentos e caracteres fora do conjunto aceito pelos bancos. */
export function sanitizePixText(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,\-/@&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

/**
 * Identifica e normaliza a chave Pix. Telefones devem vir com DDI
 * (+55...) para não serem confundidos com CPF (ambos têm 11 dígitos).
 */
export function normalizePixKey(
  raw: string,
): { type: PixKeyType; key: string } | null {
  const value = raw.trim();
  if (!value) return null;

  if (EMAIL_PATTERN.test(value)) return { type: "email", key: value.toLowerCase() };
  if (UUID_PATTERN.test(value)) return { type: "random", key: value.toLowerCase() };

  const digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) {
    return digits.length >= 12 && digits.length <= 13
      ? { type: "phone", key: `+${digits}` }
      : null;
  }
  if (digits.length === 11 && isValidCpf(digits)) return { type: "cpf", key: digits };
  if (digits.length === 14 && isValidCnpj(digits)) return { type: "cnpj", key: digits };
  return null;
}

export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

/** Monta o payload "Copia e Cola" do Pix estático. */
export function buildPixPayload(input: PixPayloadInput): string {
  const normalized = normalizePixKey(input.key);
  if (!normalized) throw new Error("Chave Pix inválida");

  const name = sanitizePixText(input.merchantName, 25);
  const city = sanitizePixText(input.merchantCity, 15);
  if (!name) throw new Error("Nome do recebedor é obrigatório");
  if (!city) throw new Error("Cidade do recebedor é obrigatória");

  const description = input.description
    ? sanitizePixText(input.description, 50)
    : "";
  const txid =
    (input.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const merchantAccount =
    emv("00", "br.gov.bcb.pix") +
    emv("01", normalized.key) +
    (description ? emv("02", description) : "");

  let payload =
    emv("00", "01") +
    emv("26", merchantAccount) +
    emv("52", "0000") +
    emv("53", "986") +
    (input.amount && input.amount > 0 ? emv("54", input.amount.toFixed(2)) : "") +
    emv("58", "BR") +
    emv("59", name) +
    emv("60", city) +
    emv("62", emv("05", txid));

  payload += "6304";
  return payload + crc16(payload);
}
