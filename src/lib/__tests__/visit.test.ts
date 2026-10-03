import { describe, expect, it } from "vitest";
import {
  extractVisitInfo,
  getClientIp,
  getPrimaryLanguage,
  getVisitSource,
  hashIp,
} from "@/lib/visit";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("getClientIp", () => {
  it("usa o primeiro IP de x-forwarded-for", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "200.1.2.3, 10.0.0.1" }))).toBe("200.1.2.3");
  });

  it("cai para x-real-ip e depois null", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "200.9.9.9" }))).toBe("200.9.9.9");
    expect(getClientIp(new Headers())).toBeNull();
  });
});

describe("hashIp", () => {
  it("é determinístico e depende do salt", async () => {
    const a = await hashIp("200.1.2.3", "salt");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp("200.1.2.3", "salt")).toBe(a);
    expect(await hashIp("200.1.2.3", "outro")).not.toBe(a);
  });
});

describe("getVisitSource", () => {
  it("identifica QR Code pelo parâmetro s=qr", () => {
    expect(getVisitSource(new URLSearchParams("s=qr"))).toBe("qr");
    expect(getVisitSource(new URLSearchParams("s=QR"))).toBe("qr");
    expect(getVisitSource(new URLSearchParams(""))).toBe("nfc");
    expect(getVisitSource(new URLSearchParams("s=outro"))).toBe("nfc");
  });
});

describe("getPrimaryLanguage", () => {
  it("extrai o idioma preferido", () => {
    expect(getPrimaryLanguage("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
    expect(getPrimaryLanguage("*")).toBeNull();
    expect(getPrimaryLanguage(null)).toBeNull();
  });
});

describe("extractVisitInfo", () => {
  it("monta o registro completo do acesso", async () => {
    const headers = new Headers({
      "user-agent": iphone,
      "x-forwarded-for": "200.1.2.3",
      "accept-language": "pt-BR,pt;q=0.9",
      referer: "https://instagram.com/",
      "x-vercel-ip-country": "BR",
      "x-vercel-ip-country-region": "SP",
      "x-vercel-ip-city": "S%C3%A3o%20Paulo",
      "x-vercel-ip-latitude": "-23.5475",
      "x-vercel-ip-longitude": "-46.6361",
    });

    const info = await extractVisitInfo(headers, new URLSearchParams("s=qr"), "salt");

    expect(info).toMatchObject({
      source: "qr",
      user_agent: iphone,
      browser: "Safari",
      os: "iOS",
      device_type: "mobile",
      device_vendor: "Apple",
      is_bot: false,
      language: "pt-BR",
      referer: "https://instagram.com/",
      country: "BR",
      region: "SP",
      city: "São Paulo",
      latitude: -23.5475,
      longitude: -46.6361,
    });
    expect(info.ip_hash).toBe(await hashIp("200.1.2.3", "salt"));
  });

  it("usa Client Hints quando o UA não ajuda e tolera cabeçalhos ausentes", async () => {
    const info = await extractVisitInfo(
      new Headers({ "user-agent": "AppDesconhecido/1.0", "sec-ch-ua-mobile": "?1", "sec-ch-ua-platform": '"Android"' }),
      new URLSearchParams(),
      "salt",
    );
    expect(info).toMatchObject({
      source: "nfc",
      ip_hash: null,
      os: "Android",
      device_type: "mobile",
      city: null,
      latitude: null,
    });
  });
});
