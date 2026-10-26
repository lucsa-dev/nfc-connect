import { describe, expect, it } from "vitest";
import { buildPixelRedirectPage, isValidPixelId } from "@/lib/pixel";

describe("isValidPixelId", () => {
  it("aceita só números", () => {
    expect(isValidPixelId("1234567890123456")).toBe(true);
    expect(isValidPixelId("123")).toBe(false);
    expect(isValidPixelId("1234567890'); alert(1);//")).toBe(false);
    expect(isValidPixelId(null)).toBe(false);
  });
});

describe("buildPixelRedirectPage", () => {
  const pixel = "1234567890123456";

  it("dispara o PageView e redireciona para o destino", () => {
    const html = buildPixelRedirectPage(pixel, "https://g.page/r/abc/review");
    expect(html).toContain("fbq('init', '1234567890123456')");
    expect(html).toContain("fbq('track', 'PageView')");
    expect(html).toContain('var to = "https://g.page/r/abc/review"');
    expect(html).toContain('content="3;url=https://g.page/r/abc/review"');
    expect(html).toContain("tr?id=1234567890123456&amp;ev=PageView");
  });

  it("escapa o destino no HTML e no script", () => {
    const html = buildPixelRedirectPage(pixel, 'https://x.com/?a=1&b="</script><script>alert(1)</script>');
    expect(html).not.toContain("</script><script>alert(1)");
    expect(html).toContain("a=1&#38;b=&#34;");
    expect(html).toContain("\\u003c/script>");
  });

  it("recusa Pixel inválido", () => {
    expect(() => buildPixelRedirectPage("abc", "https://x.com")).toThrow();
  });
});
