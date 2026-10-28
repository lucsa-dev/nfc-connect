import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { checkoutBody, pagbankBase, readCheckout, readOrderPayment, validSignature } = await import("@/lib/pagbank");

describe("pagbankBase", () => {
  it("usa o sandbox a menos que seja produção", () => {
    expect(pagbankBase(undefined)).toBe("https://sandbox.api.pagseguro.com");
    expect(pagbankBase("production")).toBe("https://api.pagseguro.com");
  });
});

describe("checkoutBody", () => {
  it("cobra o valor em centavos com Pix e cartão e vence em 24 h", () => {
    const body = checkoutBody(
      { referenceId: "lead-1", itemName: "Kit TopTap", amountCents: 9000, redirectUrl: "https://a/r", notificationUrl: "https://a/n" },
      new Date("2026-10-27T12:00:00Z"),
    );
    expect(body.reference_id).toBe("lead-1");
    expect(body.items).toEqual([{ reference_id: "kit", name: "Kit TopTap", quantity: 1, unit_amount: 9000 }]);
    expect(body.payment_methods).toEqual([{ type: "PIX" }, { type: "CREDIT_CARD" }]);
    expect(body.expiration_date).toBe("2026-10-28T12:00:00.000Z");
    expect(body.payment_notification_urls).toEqual(["https://a/n"]);
  });
});

describe("readCheckout", () => {
  it("pega o id e o link PAY", () => {
    expect(
      readCheckout({
        id: "CHEC_1",
        links: [
          { rel: "SELF", href: "https://api/checkouts/CHEC_1" },
          { rel: "PAY", href: "https://pagamento.pagseguro.uol.com.br/pagamento?code=x" },
        ],
      }),
    ).toEqual({ id: "CHEC_1", payUrl: "https://pagamento.pagseguro.uol.com.br/pagamento?code=x" });
    expect(readCheckout({ id: "CHEC_1", links: [] })).toBeNull();
  });
});

describe("validSignature", () => {
  const body = '{"id":"ORDE_1","charges":[{"status":"PAID"}]}';
  const signature = createHash("sha256").update(`tok-${body}`).digest("hex");

  it("aceita o SHA-256 de token-corpo", () => {
    expect(validSignature(body, signature, "tok")).toBe(true);
    expect(validSignature(body, signature.toUpperCase(), "tok")).toBe(true);
  });

  it("recusa corpo alterado, outro token ou assinatura ausente", () => {
    expect(validSignature(body + " ", signature, "tok")).toBe(false);
    expect(validSignature(body, signature, "outro")).toBe(false);
    expect(validSignature(body, null, "tok")).toBe(false);
    expect(validSignature(body, signature, undefined)).toBe(false);
  });
});

describe("readOrderPayment", () => {
  it("pago quando alguma cobrança foi paga", () => {
    expect(readOrderPayment({ reference_id: "lead-1", charges: [{ status: "DECLINED" }, { status: "PAID" }] })).toEqual({
      referenceId: "lead-1",
      result: "pago",
    });
  });

  it("recusado quando todas falharam; aguardando nos outros casos", () => {
    expect(readOrderPayment({ reference_id: "lead-1", charges: [{ status: "DECLINED" }] }).result).toBe("recusado");
    expect(readOrderPayment({ reference_id: "lead-1", charges: [{ status: "WAITING" }] }).result).toBeNull();
    expect(readOrderPayment({ reference_id: "lead-1" }).result).toBeNull();
  });
});
