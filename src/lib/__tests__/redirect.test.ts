import { describe, expect, it, vi } from "vitest";
import { redirectResponse, resolveRedirect, type LinkRepository, type ResolvedLink } from "@/lib/redirect";

const link: ResolvedLink = {
  id: "link-1",
  business_id: "biz-1",
  url: "https://g.page/r/abc/review",
  type: "review",
  pix_key: null,
  meta_pixel_id: null,
};

function repoWith(found: ResolvedLink | null) {
  return {
    findActiveLink: vi.fn(async () => found),
    recordVisit: vi.fn(async () => {}),
  } satisfies LinkRepository;
}

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://cards.com.br${path}`, { headers });
}

describe("resolveRedirect", () => {
  it("redireciona para a URL do link e registra o acesso depois", async () => {
    const repo = repoWith(link);
    const decision = await resolveRedirect({
      businessSlug: "Padaria",
      linkSlug: "avaliacao",
      request: request("/padaria/avaliacao?s=qr", { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148" }),
      repo,
      ipSalt: "salt",
    });

    expect(repo.findActiveLink).toHaveBeenCalledWith("padaria", "avaliacao");
    expect(decision.kind).toBe("redirect");
    if (decision.kind !== "redirect") return;
    expect(decision.location).toBe(link.url);
    expect(decision.pixelId).toBeNull();
    expect(repo.recordVisit).not.toHaveBeenCalled();

    await decision.record();
    expect(repo.recordVisit).toHaveBeenCalledTimes(1);
    const [, visit] = repo.recordVisit.mock.calls[0] as unknown as [ResolvedLink, { source: string; os: string }];
    expect(visit.source).toBe("qr");
    expect(visit.os).toBe("iOS");
  });

  it("envia Pix sem URL para a página de Pix interna", async () => {
    const decision = await resolveRedirect({
      businessSlug: "padaria",
      linkSlug: "pix",
      request: request("/padaria/pix"),
      repo: repoWith({ ...link, type: "pix", url: null, pix_key: "52998224725" }),
      ipSalt: "salt",
    });
    expect(decision).toMatchObject({ kind: "redirect", location: "https://cards.com.br/padaria/pix/pix" });
  });

  it("retorna not_found para link inexistente ou inativo", async () => {
    const decision = await resolveRedirect({
      businessSlug: "padaria",
      linkSlug: "nada",
      request: request("/padaria/nada"),
      repo: repoWith(null),
      ipSalt: "salt",
    });
    expect(decision.kind).toBe("not_found");
  });

  it("não consulta o banco com slugs inválidos", async () => {
    const repo = repoWith(link);
    const decision = await resolveRedirect({
      businessSlug: "favicon.ico",
      linkSlug: "x",
      request: request("/favicon.ico/x"),
      repo,
      ipSalt: "salt",
    });
    expect(decision.kind).toBe("not_found");
    expect(repo.findActiveLink).not.toHaveBeenCalled();
  });

  it("devolve o Pixel do negócio só quando o ID é válido", async () => {
    const resolve = (meta_pixel_id: string | null) =>
      resolveRedirect({
        businessSlug: "padaria",
        linkSlug: "avaliacao",
        request: request("/padaria/avaliacao"),
        repo: repoWith({ ...link, meta_pixel_id }),
        ipSalt: "salt",
      });
    expect(await resolve("1234567890123456")).toMatchObject({ kind: "redirect", pixelId: "1234567890123456" });
    expect(await resolve("abc")).toMatchObject({ kind: "redirect", pixelId: null });
  });
});

describe("redirectResponse", () => {
  it("sem Pixel, redireciona direto com 302", () => {
    const res = redirectResponse(link.url!);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(link.url);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("com Pixel, devolve a página de passagem sem cache", async () => {
    const res = redirectResponse(link.url!, "1234567890123456");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toContain("no-store");
    const html = await res.text();
    expect(html).toContain("fbq('init', '1234567890123456')");
    expect(html).toContain(JSON.stringify(link.url));
  });

  it("cliques vindos da página do negócio não passam de novo pelo Pixel", async () => {
    const decision = await resolveRedirect({
      businessSlug: "padaria",
      linkSlug: "avaliacao",
      request: request("/padaria/avaliacao?de=pagina"),
      repo: repoWith({ ...link, meta_pixel_id: "1234567890123456" }),
      ipSalt: "salt",
    });
    expect(decision).toMatchObject({ kind: "redirect", pixelId: null });
  });
});
