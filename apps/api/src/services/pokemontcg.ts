import { env } from '../env.js';

/**
 * Thin client for the Pokémon TCG API (https://docs.pokemontcg.io).
 * An API key is optional but raises the rate limit substantially.
 */
const BASE = 'https://api.pokemontcg.io/v2';

function headers(): HeadersInit {
  return env.POKEMONTCG_API_KEY ? { 'X-Api-Key': env.POKEMONTCG_API_KEY } : {};
}

export interface PtcgSet {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  ptcgoCode?: string;
  releaseDate?: string;
  legalities?: Record<string, string>;
  images?: { symbol?: string; logo?: string };
}

export interface PtcgCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  types?: string[];
  hp?: string;
  number?: string;
  rarity?: string;
  regulationMark?: string;
  nationalPokedexNumbers?: number[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  abilities?: unknown[];
  attacks?: unknown[];
  weaknesses?: unknown[];
  resistances?: unknown[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  flavorText?: string;
  artist?: string;
  images?: { small?: string; large?: string };
  legalities?: Record<string, string>;
  set: { id: string };
  [k: string]: unknown;
}

interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET a page with retry + exponential backoff. The pokemontcg.io API
 * intermittently returns 429/5xx (e.g. transient 504s); a single blip should
 * not abort a full sync, so retry up to `maxRetries` with jittered backoff.
 */
async function get<T>(path: string, maxRetries = 5): Promise<PagedResponse<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: headers() });
      if (res.ok) return (await res.json()) as PagedResponse<T>;
      if (!RETRYABLE.has(res.status) || attempt === maxRetries) {
        throw new Error(`pokemontcg ${path} -> ${res.status} ${res.statusText}`);
      }
      lastErr = new Error(`${res.status} ${res.statusText}`);
    } catch (err) {
      // Network/timeout errors are retryable too.
      lastErr = err;
      if (attempt === maxRetries) throw err;
    }
    const backoff = Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 500);
    await sleep(backoff);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchAllSets(): Promise<PtcgSet[]> {
  const out: PtcgSet[] = [];
  let page = 1;
  for (;;) {
    const res = await get<PtcgSet>(`/sets?page=${page}&pageSize=250&orderBy=releaseDate`);
    out.push(...res.data);
    if (res.data.length < 250) break;
    page += 1;
  }
  return out;
}

/** Iterate all cards page-by-page (there are ~19k). Yields each page. */
export async function* iterateCards(pageSize = 250): AsyncGenerator<PtcgCard[]> {
  let page = 1;
  for (;;) {
    const res = await get<PtcgCard>(`/cards?page=${page}&pageSize=${pageSize}&orderBy=set.releaseDate`);
    if (res.data.length === 0) break;
    yield res.data;
    if (res.data.length < pageSize) break;
    page += 1;
  }
}
