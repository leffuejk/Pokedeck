import { env } from '../env.js';
import type { SourceCard } from './pokemon-tcg-data.js';

/**
 * Live pokemontcg.io API client — used ONLY as the fallback for local card
 * cache misses (see card-repository.ts). The bulk sync uses the git repo source
 * (pokemon-tcg-data.ts), not this. An API key is optional but raises limits.
 */
const BASE = 'https://api.pokemontcg.io/v2';

function headers(): HeadersInit {
  return env.POKEMONTCG_API_KEY ? { 'X-Api-Key': env.POKEMONTCG_API_KEY } : {};
}

/** The API embeds a `set` object the repo files omit; its id is our set FK. */
export type ApiCard = SourceCard & { set: { id: string } };

/** Fetch a single card by id. Returns null on 404, throws on other errors. */
export async function fetchCardById(id: string): Promise<ApiCard | null> {
  const res = await fetch(`${BASE}/cards/${encodeURIComponent(id)}`, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pokemontcg /cards/${id} -> ${res.status} ${res.statusText}`);
  const body = (await res.json()) as { data?: ApiCard };
  return body.data ?? null;
}
