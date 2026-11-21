/**
 * Minimal, polite HTTP client for proclubs.ea.com public read endpoints.
 * - no credentials, no cookies, honest User-Agent
 * - timeout, limited retries with exponential backoff on 429/5xx only
 * - requests are spaced by at least MIN_INTERVAL_MS
 * - an anti-bot 403 is reported as EaBlockedError and NOT retried or worked around
 */
import type { EaMatchType, EaPlatform } from "./types";

export const EA_BASE_URL = "https://proclubs.ea.com/api/fc";
const MIN_INTERVAL_MS = 1500;
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export class EaBlockedError extends Error {
  constructor() {
    super("A EA recusou a consulta (403 do CDN). Isso costuma acontecer com servidores em nuvem. Use o agente local ou importe o JSON pelo navegador.");
  }
}
export class EaHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

let lastRequest = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function eaUrl(path: string, params: Record<string, string>) {
  return `${EA_BASE_URL}/${path}?${new URLSearchParams(params).toString()}`;
}

export function matchesUrl(platform: EaPlatform, clubId: string, matchType: EaMatchType) {
  return eaUrl("clubs/matches", { platform, clubIds: clubId, matchType, maxResultCount: "10" });
}
export function searchUrl(platform: EaPlatform, clubName: string) {
  return eaUrl("allTimeLeaderboard/search", { platform, clubName });
}
export function clubInfoUrl(platform: EaPlatform, clubId: string) {
  return eaUrl("clubs/info", { platform, clubIds: clubId });
}

export async function eaGet(url: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  let attempt = 0;
  for (;;) {
    const wait = lastRequest + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest = Date.now();
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "AscendFC-Platform/1.0 (club stats sync)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (e) {
      if (attempt++ < MAX_RETRIES) { await sleep(1000 * 2 ** attempt); continue; }
      throw new EaHttpError(0, `Falha de rede ao consultar a EA: ${(e as Error).message}`);
    }
    if (res.status === 403) throw new EaBlockedError();
    if ((res.status === 429 || res.status >= 500) && attempt++ < MAX_RETRIES) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw new EaHttpError(res.status, `A EA respondeu HTTP ${res.status}.`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new EaHttpError(res.status, "A EA respondeu algo que não é JSON.");
    }
  }
}
