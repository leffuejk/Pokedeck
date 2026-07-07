/**
 * Local-first card lookups. Reads our own `cards` table first; on a cache miss
 * falls back to the live pokemontcg.io API (always on), logs the miss so gaps
 * are visible, and caches the fetched card locally so the next read is local.
 *
 * The lookup dependencies are injected (findLocal / fetchRemote / cacheCard /
 * onFallback) so this module imports no DB, env, or network and is unit-testable.
 */
import { mapCard, type MappedCard } from './card-mapping.js';
import type { SourceCard } from './pokemon-tcg-data.js';
import type { Card } from '../db/schema.js';

export interface CardLookup {
  /** Read a card from our database, or null if we don't have it. */
  findLocal(id: string): Promise<Card | null>;
  /** Fallback: fetch from the live API. Returns the card + its set id, or null. */
  fetchRemote(id: string): Promise<{ card: SourceCard; setId: string } | null>;
  /** Persist a fallback-fetched card so future reads are local. */
  cacheCard(row: MappedCard): Promise<Card | null>;
  /** Invoked when the fallback fires (for logging/metrics on cache gaps). */
  onFallback(id: string): void;
}

export async function getCardById(id: string, deps: CardLookup): Promise<Card | null> {
  const local = await deps.findLocal(id);
  if (local) return local;

  // Cache miss — fall back to the live API.
  deps.onFallback(id);
  const remote = await deps.fetchRemote(id);
  if (!remote) return null;

  const mapped = mapCard(remote.card, remote.setId);
  return deps.cacheCard(mapped);
}
