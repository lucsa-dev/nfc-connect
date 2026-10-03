import { describe, expect, it } from "vitest";
import { parseUserAgent } from "@/lib/user-agent";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.3.30.91 (iPhone15,2; iOS 17_4; pt_BR; pt; scale=3.00; 1179x2556; 593378325)",
  samsungInternet:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  androidChromeMoto:
    "Mozilla/5.0 (Linux; Android 13; moto g84 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 12; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.2535.67",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  linuxFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
  whatsapp: "WhatsApp/2.23.20.0",
  googlebot:
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
};

describe("parseUserAgent", () => {
  it("iPhone com Safari", () => {
    expect(parseUserAgent(UA.iphoneSafari)).toEqual({
      browser: "Safari",
      browserVersion: "17.5",
      os: "iOS",
      osVersion: "17.5.1",
      deviceType: "mobile",
      deviceVendor: "Apple",
      isBot: false,
    });
  });

  it("navegador interno do Instagram", () => {
    const r = parseUserAgent(UA.iphoneInstagram);
    expect(r.browser).toBe("Instagram");
    expect(r.browserVersion).toBe("330.0.3.30.91");
    expect(r.os).toBe("iOS");
    expect(r.deviceType).toBe("mobile");
  });

  it("Samsung Internet no Galaxy", () => {
    const r = parseUserAgent(UA.samsungInternet);
    expect(r).toMatchObject({
      browser: "Samsung Internet",
      browserVersion: "25.0",
      os: "Android",
      osVersion: "14",
      deviceType: "mobile",
      deviceVendor: "Samsung",
    });
  });

  it("Chrome em Motorola", () => {
    expect(parseUserAgent(UA.androidChromeMoto)).toMatchObject({
      browser: "Chrome",
      os: "Android",
      deviceType: "mobile",
      deviceVendor: "Motorola",
    });
  });

  it("tablets Android e iPad", () => {
    expect(parseUserAgent(UA.androidTablet).deviceType).toBe("tablet");
    expect(parseUserAgent(UA.ipad)).toMatchObject({ deviceType: "tablet", os: "iOS", osVersion: "16.6" });
  });

  it("Edge no Windows (não confunde com Chrome)", () => {
    expect(parseUserAgent(UA.windowsEdge)).toMatchObject({
      browser: "Edge",
      os: "Windows",
      osVersion: "10",
      deviceType: "desktop",
    });
  });

  it("Chrome no macOS e Firefox no Linux", () => {
    expect(parseUserAgent(UA.macChrome)).toMatchObject({
      browser: "Chrome",
      os: "macOS",
      osVersion: "10.15.7",
      deviceType: "desktop",
    });
    expect(parseUserAgent(UA.linuxFirefox)).toMatchObject({
      browser: "Firefox",
      browserVersion: "126.0",
      os: "Linux",
      deviceType: "desktop",
    });
  });

  it.each([UA.whatsapp, UA.googlebot, UA.facebook])("identifica robôs: %s", (ua) => {
    const r = parseUserAgent(ua);
    expect(r.isBot).toBe(true);
    expect(r.deviceType).toBe("bot");
  });

  it("lida com UA ausente", () => {
    expect(parseUserAgent(null)).toMatchObject({ deviceType: "unknown", isBot: false, os: null });
  });
});
