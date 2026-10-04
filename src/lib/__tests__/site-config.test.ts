import { describe, expect, it } from "vitest";
import { contactHref } from "@/lib/site-config";

describe("contactHref", () => {
  it("prioriza o WhatsApp com mensagem pronta", () => {
    expect(contactHref("Oi!", { whatsapp: "5511999998888", email: "a@b.com" })).toBe(
      "https://wa.me/5511999998888?text=Oi!",
    );
  });

  it("usa e-mail quando não há WhatsApp", () => {
    expect(contactHref("Olá mundo", { whatsapp: null, email: "a@b.com" })).toBe(
      "mailto:a@b.com?subject=Cart%C3%A3o%20TopTap&body=Ol%C3%A1%20mundo",
    );
  });

  it("retorna null sem contato configurado", () => {
    expect(contactHref("x", { whatsapp: null, email: null })).toBeNull();
  });
});
