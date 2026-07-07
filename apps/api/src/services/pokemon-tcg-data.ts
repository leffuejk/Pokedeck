/**
 * Card data source: the pokemon-tcg-data GitHub repo
 * (https://github.com/PokemonTCG/pokemon-tcg-data), which is the upstream that
 * powers the pokemontcg.io API. Reading it directly avoids API rate limits and
 * pagination, and is never staler than the API. One JSON file per set.
 */
const REPO_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';

export interface SourceSet {
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

export interface SourceCard {
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
  legalities?: { standard?: string; expanded?: string; unlimited?: string };
  [k: string]: unknown;
}

/** The interface the sync depends on — swappable + mockable in tests. */
export interface CardSource {
  fetchAllSets(): Promise<SourceSet[]>;
  fetchCardsForSet(setId: string): Promise<SourceCard[]>;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, maxRetries = 5): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as T;
      if (!RETRYABLE.has(res.status) || attempt === maxRetries) {
        throw new Error(`pokemon-tcg-data ${url} -> ${res.status} ${res.statusText}`);
      }
      lastErr = new Error(`${res.status} ${res.statusText}`);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) throw err;
    }
    await sleep(Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 500));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Live source backed by the GitHub repo. */
export const repoCardSource: CardSource = {
  fetchAllSets: () => getJson<SourceSet[]>(`${REPO_BASE}/sets/en.json`),
  fetchCardsForSet: (setId) => getJson<SourceCard[]>(`${REPO_BASE}/cards/en/${setId}.json`),
};
