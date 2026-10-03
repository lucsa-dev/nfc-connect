import { describe, expect, it, vi } from "vitest";
import { resolveRedirect, type LinkRepository, type ResolvedLink } from "@/lib/redirect";

const link: ResolvedLink = {
  id: "link-1",
  business_id: "biz-1",
  url: "https://g.page/r/abc/review",
  type: "review",
  pix_key: null,
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
});
