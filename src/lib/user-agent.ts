export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "unknown";

export interface ParsedUserAgent {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: DeviceType;
  deviceVendor: string | null;
  isBot: boolean;
}

// Inclui os robôs de pré-visualização de links (WhatsApp, Instagram...),
// que não devem contar como acesso real.
const BOT_PATTERN =
  /bot\b|crawler|spider|crawling|facebookexternalhit|facebookcatalog|whatsapp\/|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|preview|headlesschrome|lighthouse|curl\/|wget\/|python-requests|axios\/|node-fetch|go-http-client|okhttp/i;

// A ordem importa: apps e navegadores derivados antes dos genéricos.
const BROWSERS: Array<[name: string, pattern: RegExp]> = [
  ["Instagram", /Instagram[ /]([\d.]+)/],
  ["Facebook", /FB(?:AV|_IAB)\/([\d.]+)|FBAN\//],
  ["TikTok", /(?:musical_ly|TikTok|BytedanceWebview)[_/ ]?([\d.]+)?/i],
  ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ["Opera", /(?:OPR|Opera|OPiOS)\/([\d.]+)/],
  ["Yandex", /YaBrowser\/([\d.]+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
  ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
  ["Safari", /Version\/([\d.]+).*Safari\//],
  ["Safari", /AppleWebKit\/.*\(KHTML, like Gecko\) Mobile\//],
];

const VENDORS: Array<[name: string, pattern: RegExp]> = [
  ["Apple", /iPhone|iPad|iPod|Macintosh/],
  ["Samsung", /SM-[A-Z0-9]+|Samsung|GT-[A-Z0-9]+/i],
  ["Motorola", /moto|XT\d{4}/i],
  ["Xiaomi", /Xiaomi|Redmi|POCO|\bMi\s|M\d{4}[A-Z]\d+[A-Z]/i],
  ["Huawei", /Huawei|HONOR/i],
  ["LG", /\bLG[-\s]|LM-[A-Z0-9]+/i],
  ["Google", /Pixel/],
  ["OnePlus", /OnePlus/i],
  ["Asus", /ASUS|Zenfone/i],
  ["Nokia", /Nokia/i],
];

function match(ua: string, pattern: RegExp): string | null {
  const m = pattern.exec(ua);
  return m ? (m[1] ?? "") : null;
}

function detectOs(ua: string): { os: string | null; osVersion: string | null } {
  let v: string | null;
  if ((v = match(ua, /(?:iPhone|CPU) OS ([\d_]+)/)) !== null)
    return { os: "iOS", osVersion: v.replace(/_/g, ".") || null };
  if (/iPad|iPod|iPhone/.test(ua)) return { os: "iOS", osVersion: null };
  if ((v = match(ua, /Android\s?([\d.]+)?/)) !== null)
    return { os: "Android", osVersion: v || null };
  if ((v = match(ua, /Windows NT ([\d.]+)/)) !== null) {
    const names: Record<string, string> = {
      "10.0": "10",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    return { os: "Windows", osVersion: names[v] ?? v };
  }
  if ((v = match(ua, /CrOS \S+ ([\d.]+)/)) !== null)
    return { os: "ChromeOS", osVersion: v || null };
  if ((v = match(ua, /Mac OS X ([\d_.]+)/)) !== null)
    return { os: "macOS", osVersion: v.replace(/_/g, ".") || null };
  if (/Macintosh/.test(ua)) return { os: "macOS", osVersion: null };
  if (/Linux/.test(ua)) return { os: "Linux", osVersion: null };
  return { os: null, osVersion: null };
}

function detectBrowser(ua: string) {
  for (const [name, pattern] of BROWSERS) {
    const v = match(ua, pattern);
    if (v !== null) return { browser: name, browserVersion: v || null };
  }
  return { browser: null, browserVersion: null };
}

function detectDeviceType(ua: string, os: string | null): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua)) return "tablet";
  // Android sem "Mobile" costuma ser tablet.
  if (os === "Android") return /Mobile/.test(ua) ? "mobile" : "tablet";
  if (/Mobi|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
  if (os === "Windows" || os === "macOS" || os === "Linux" || os === "ChromeOS")
    return "desktop";
  return "unknown";
}

function detectVendor(ua: string): string | null {
  for (const [name, pattern] of VENDORS) if (pattern.test(ua)) return name;
  return null;
}

/** Parser leve de User-Agent, suficiente para as estatísticas de acesso. */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return {
      browser: null,
      browserVersion: null,
      os: null,
      osVersion: null,
      deviceType: "unknown",
      deviceVendor: null,
      isBot: false,
    };
  }

  const isBot = BOT_PATTERN.test(ua);
  const { os, osVersion } = detectOs(ua);
  const { browser, browserVersion } = isBot
    ? { browser: null, browserVersion: null }
    : detectBrowser(ua);

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType: isBot ? "bot" : detectDeviceType(ua, os),
    deviceVendor: detectVendor(ua),
    isBot,
  };
}
