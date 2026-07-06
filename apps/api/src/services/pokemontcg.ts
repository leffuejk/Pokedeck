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

async function get<T>(path: string): Promise<PagedResponse<T>> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`pokemontcg ${path} -> ${res.status} ${res.statusText}`);
  return (await res.json()) as PagedResponse<T>;
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
