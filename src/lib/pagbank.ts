import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Checkout PagBank: o servidor cria o link de pagamento e o cliente paga na
 * página do PagBank (Pix ou cartão), sem dado de cartão passar pelo site.
 * O resultado chega pelo webhook (/api/pagbank), assinado com o token da conta.
 * Documentação: https://developer.pagbank.com.br/reference/criar-checkout
 */

const token = () => process.env.PAGBANK_TOKEN;

export const pagbankEnabled = () => Boolean(token());

/** Sandbox por padrão; PAGBANK_ENV=production cobra de verdade. */
export const pagbankBase = (env = process.env.PAGBANK_ENV) =>
  env === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";

export interface CheckoutInput {
  /** Id do lead: volta no webhook como reference_id. */
  referenceId: string;
  itemName: string;
  amountCents: number;
  redirectUrl: string;
  notificationUrl: string;
}

export function checkoutBody(input: CheckoutInput, now = new Date()) {
  return {
    reference_id: input.referenceId,
    items: [{ reference_id: "kit", name: input.itemName.slice(0, 100), quantity: 1, unit_amount: input.amountCents }],
    payment_methods: [{ type: "PIX" }, { type: "CREDIT_CARD" }],
    // Nome, CPF e e-mail são preenchidos pelo cliente na página do PagBank.
    customer_modifiable: true,
    expiration_date: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
    redirect_url: input.redirectUrl,
    notification_urls: [input.notificationUrl],
    payment_notification_urls: [input.notificationUrl],
  };
}

/** Link "PAY" da resposta da criação do checkout. */
export function readCheckout(json: unknown): { id: string; payUrl: string } | null {
  const data = json as { id?: unknown; links?: Array<{ rel?: unknown; href?: unknown }> };
  const pay = data.links?.find((l) => l.rel === "PAY")?.href;
  return typeof data.id === "string" && typeof pay === "string" ? { id: data.id, payUrl: pay } : null;
}

export async function createCheckout(input: CheckoutInput): Promise<{ id: string; payUrl: string }> {
  const res = await fetch(`${pagbankBase()}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(checkoutBody(input)),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`PagBank ${res.status}: ${await res.text()}`);
  const checkout = readCheckout(await res.json());
  if (!checkout) throw new Error("PagBank: checkout sem link de pagamento");
  return checkout;
}

/** Assinatura do webhook: SHA-256 de "{token}-{corpo}", com o corpo exatamente como chegou. */
export function validSignature(rawBody: string, signature: string | null, secret = token()): boolean {
  if (!secret || !signature) return false;
  const expected = createHash("sha256").update(`${secret}-${rawBody}`, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaymentResult = "pago" | "recusado" | null;

/**
 * Resultado de um pedido do webhook: pago se alguma cobrança foi paga,
 * recusado se todas foram recusadas ou canceladas; null enquanto aguarda.
 */
export function readOrderPayment(json: unknown): { referenceId: string | null; result: PaymentResult } {
  const order = json as { reference_id?: unknown; charges?: Array<{ status?: unknown }> };
  const statuses = (order.charges ?? []).map((c) => c.status);
  const referenceId = typeof order.reference_id === "string" ? order.reference_id : null;
  if (statuses.includes("PAID")) return { referenceId, result: "pago" };
  if (statuses.length && statuses.every((s) => s === "DECLINED" || s === "CANCELED")) return { referenceId, result: "recusado" };
  return { referenceId, result: null };
}
