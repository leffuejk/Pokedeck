import { describe, it, expect, vi } from 'vitest';
import { getCardById, type CardLookup } from './card-repository.js';
import type { Card } from '../db/schema.js';
import type { SourceCard } from './pokemon-tcg-data.js';

const localCard = { id: 'sv1-1', name: 'Local Pineco' } as unknown as Card;

const remoteCard: SourceCard = {
  id: 'sv1-1',
  name: 'Remote Pineco',
  supertype: 'Pokémon',
  legalities: { standard: 'Legal', expanded: 'Legal' },
  images: { small: 'https://img/sv1-1.png' },
};

describe('getCardById (local-first with API fallback)', () => {
  it('returns the local row and never touches the API when present', async () => {
    const deps: CardLookup = {
      findLocal: vi.fn().mockResolvedValue(localCard),
      fetchRemote: vi.fn(),
      cacheCard: vi.fn(),
      onFallback: vi.fn(),
    };

    const result = await getCardById('sv1-1', deps);

    expect(result).toBe(localCard);
    expect(deps.fetchRemote).not.toHaveBeenCalled();
    expect(deps.cacheCard).not.toHaveBeenCalled();
    expect(deps.onFallback).not.toHaveBeenCalled();
  });

  it('on a cache miss: logs the fallback, fetches from the API, and caches the result', async () => {
    const cached = { id: 'sv1-1', name: 'Remote Pineco' } as unknown as Card;
    const cacheCard = vi.fn().mockResolvedValue(cached);
    const deps: CardLookup = {
      findLocal: vi.fn().mockResolvedValue(null),
      fetchRemote: vi.fn().mockResolvedValue({ card: remoteCard, setId: 'sv1' }),
      cacheCard,
      onFallback: vi.fn(),
    };

    const result = await getCardById('sv1-1', deps);

    expect(deps.onFallback).toHaveBeenCalledWith('sv1-1');
    expect(deps.fetchRemote).toHaveBeenCalledWith('sv1-1');
    expect(cacheCard).toHaveBeenCalledOnce();
    // The card is mapped before caching (promoted columns populated).
    const mapped = cacheCard.mock.calls[0]![0];
    expect(mapped.setId).toBe('sv1');
    expect(mapped.legalityStandard).toBe('Legal');
    expect(mapped.sourceHash).toEqual(expect.any(String));
    expect(result).toBe(cached);
  });

  it('returns null when the card is neither local nor on the API', async () => {
    const deps: CardLookup = {
      findLocal: vi.fn().mockResolvedValue(null),
      fetchRemote: vi.fn().mockResolvedValue(null),
      cacheCard: vi.fn(),
      onFallback: vi.fn(),
    };

    const result = await getCardById('ghost-1', deps);

    expect(result).toBeNull();
    expect(deps.onFallback).toHaveBeenCalledOnce();
    expect(deps.cacheCard).not.toHaveBeenCalled();
  });
});
