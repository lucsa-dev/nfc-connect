import { parseUserAgent, type DeviceType } from "@/lib/user-agent";
import { SOURCE_PARAM, type VisitSource } from "@/lib/urls";

export interface VisitInfo {
  source: VisitSource;
  ip_hash: string | null;
  user_agent: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device_type: DeviceType;
  device_vendor: string | null;
  is_bot: boolean;
  language: string | null;
  referer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

const MAX_TEXT = 512;

function clip(value: string | null | undefined, max = MAX_TEXT): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** IP do visitante, considerando proxies (Vercel usa x-forwarded-for). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim() || null;
  return clip(headers.get("x-real-ip"), 64);
}

/**
 * O IP é gravado apenas como hash (SHA-256 + salt) para permitir contar
 * visitantes únicos sem armazenar dado pessoal em claro (LGPD).
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function getVisitSource(searchParams: URLSearchParams): VisitSource {
  return searchParams.get(SOURCE_PARAM)?.toLowerCase() === "qr" ? "qr" : "nfc";
}

/** Primeiro idioma de Accept-Language: "pt-BR,pt;q=0.9" -> "pt-BR" */
export function getPrimaryLanguage(acceptLanguage: string | null): string | null {
  const first = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim();
  return first && first !== "*" ? first.slice(0, 35) : null;
}

/** Extrai as informações do dispositivo/visitante a partir da requisição. */
export async function extractVisitInfo(
  headers: Headers,
  searchParams: URLSearchParams,
  ipSalt: string,
): Promise<VisitInfo> {
  const userAgent = clip(headers.get("user-agent"));
  const ua = parseUserAgent(userAgent);
  const ip = getClientIp(headers);

  // Client Hints como reforço quando o UA não informa o sistema.
  const platformHint = headers.get("sec-ch-ua-platform")?.replace(/"/g, "");
  const mobileHint = headers.get("sec-ch-ua-mobile");
  let deviceType = ua.deviceType;
  if (deviceType === "unknown" && mobileHint === "?1") deviceType = "mobile";

  return {
    source: getVisitSource(searchParams),
    ip_hash: ip ? await hashIp(ip, ipSalt) : null,
    user_agent: userAgent,
    browser: ua.browser,
    browser_version: ua.browserVersion,
    os: ua.os ?? clip(platformHint, 40),
    os_version: ua.osVersion,
    device_type: deviceType,
    device_vendor: ua.deviceVendor,
    is_bot: ua.isBot,
    language: getPrimaryLanguage(headers.get("accept-language")),
    referer: clip(headers.get("referer")),
    country: clip(headers.get("x-vercel-ip-country"), 8),
    region: clip(decode(headers.get("x-vercel-ip-country-region")), 80),
    city: clip(decode(headers.get("x-vercel-ip-city")), 120),
    latitude: toNumber(headers.get("x-vercel-ip-latitude")),
    longitude: toNumber(headers.get("x-vercel-ip-longitude")),
  };
}
