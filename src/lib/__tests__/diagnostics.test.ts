import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { describeSecretKey } = await import("@/lib/diagnostics");

describe("describeSecretKey", () => {
  it("aponta chave ausente ou trocada pela publicável", () => {
    expect(describeSecretKey(undefined).ok).toBe(false);
    expect(describeSecretKey("sb_publishable_abc")).toEqual({ ok: false, detail: expect.stringContaining("publicável") });
  });

  it("aceita a chave secreta e a JWT legada", () => {
    expect(describeSecretKey("sb_secret_abc").ok).toBe(true);
    expect(describeSecretKey("eyJhbGciOi...").ok).toBe(true);
  });

  it("rejeita formato desconhecido", () => {
    expect(describeSecretKey("abc").ok).toBe(false);
  });
});
