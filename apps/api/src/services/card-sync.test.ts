import { describe, it, expect } from 'vitest';
import { syncCards, type CardStore } from './card-sync.js';
import { mapCard, classifyCard, computeSourceHash, bucketSupertype } from './card-mapping.js';
import type { MappedCard, MappedSet } from './card-mapping.js';
import type { CardSource, SourceCard, SourceSet } from './pokemon-tcg-data.js';

// ── Test doubles (no network, no DB) ──────────────────────────────
function makeSource(setList: SourceSet[], cardsBySet: Record<string, SourceCard[]>): CardSource {
  return {
    fetchAllSets: async () => setList,
    fetchCardsForSet: async (id) => cardsBySet[id] ?? [],
  };
}

function makeMemoryStore() {
  const cards = new Map<string, MappedCard>();
  const sets = new Map<string, MappedSet>();
  const runs: Array<{ status: string; cards: number }> = [];
  const store: CardStore = {
    loadCardHashes: async () => new Map([...cards].map(([id, c]) => [id, c.sourceHash])),
    upsertSets: async (rows) => rows.forEach((r) => sets.set(r.id, r)),
    upsertCards: async (rows) => rows.forEach((r) => cards.set(r.id, r)),
    startRun: async () => `run-${runs.length}`,
    finishRun: async (_id, res) => void runs.push({ status: res.status, cards: res.cards }),
  };
  return { store, cards, sets, runs };
}

function card(id: string, over: Partial<SourceCard> = {}): SourceCard {
  return {
    id,
    name: `Card ${id}`,
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: '70',
    types: ['Water'],
    legalities: { standard: 'Legal', expanded: 'Legal', unlimited: 'Legal' },
    images: { small: `https://img/${id}.png`, large: `https://img/${id}_hires.png` },
    ...over,
  };
}

const SET: SourceSet = { id: 'sv1', name: 'Scarlet & Violet', releaseDate: '2023/03/31' };

// ── Idempotency ───────────────────────────────────────────────────
describe('syncCards idempotency', () => {
  it('first run inserts all; second run with identical data is all unchanged', async () => {
    const source = makeSource([SET], { sv1: [card('sv1-1'), card('sv1-2'), card('sv1-3')] });
    const mem = makeMemoryStore();

    const first = await syncCards(source, mem.store, () => {});
    expect(first).toMatchObject({ sets: 1, inserted: 3, updated: 0, unchanged: 0 });
    expect(mem.cards.size).toBe(3);

    const second = await syncCards(source, mem.store, () => {});
    expect(second).toMatchObject({ sets: 1, inserted: 0, updated: 0, unchanged: 3 });
    expect(mem.cards.size).toBe(3);
  });

  it('a brand-new card in a later run is inserted, the rest unchanged', async () => {
    const mem = makeMemoryStore();
    await syncCards(makeSource([SET], { sv1: [card('sv1-1')] }), mem.store, () => {});
    const second = await syncCards(
      makeSource([SET], { sv1: [card('sv1-1'), card('sv1-2')] }),
      mem.store,
      () => {},
    );
    expect(second).toMatchObject({ inserted: 1, updated: 0, unchanged: 1 });
  });
});

// ── Legality updates ──────────────────────────────────────────────
describe('syncCards legality updates', () => {
  it('detects a legality change as an update and rewrites the promoted columns', async () => {
    const mem = makeMemoryStore();
    await syncCards(
      makeSource([SET], { sv1: [card('sv1-1', { legalities: { standard: 'Legal', expanded: 'Legal' } })] }),
      mem.store,
      () => {},
    );
    expect(mem.cards.get('sv1-1')!.legalityStandard).toBe('Legal');

    // Card rotates out of Standard (no `standard` key), still Expanded-legal.
    const rotated = card('sv1-1', { legalities: { expanded: 'Legal' } });
    const result = await syncCards(makeSource([SET], { sv1: [rotated] }), mem.store, () => {});

    expect(result).toMatchObject({ inserted: 0, updated: 1, unchanged: 0 });
    expect(mem.cards.get('sv1-1')!.legalityStandard).toBeNull();
    expect(mem.cards.get('sv1-1')!.legalityExpanded).toBe('Legal');
  });
});

// ── Pure mapping ──────────────────────────────────────────────────
describe('mapCard / bucketSupertype', () => {
  it('buckets unknown supertypes into Other, never dropping them', () => {
    expect(bucketSupertype('Pokémon')).toBe('Pokémon');
    expect(bucketSupertype('Energy')).toBe('Energy');
    expect(bucketSupertype('Mystery Box')).toBe('Other');
    expect(mapCard(card('x-1', { supertype: 'Mystery Box' }), 'x').supertype).toBe('Other');
  });

  it('promotes legality columns, parses hp, and keeps images as URLs + raw payload', () => {
    const m = mapCard(card('sv1-9', { hp: '130' }), 'sv1');
    expect(m.setId).toBe('sv1');
    expect(m.hp).toBe(130);
    expect(m.legalityStandard).toBe('Legal');
    expect(m.legalityExpanded).toBe('Legal');
    expect(m.smallImageUrl).toBe('https://img/sv1-9.png');
    expect(m.raw).toBeDefined();
    expect(typeof m.sourceHash).toBe('string');
  });

  it('produces a stable hash for identical source and a different one on change', () => {
    const a = computeSourceHash(card('sv1-1'));
    const b = computeSourceHash(card('sv1-1'));
    const c = computeSourceHash(card('sv1-1', { hp: '200' }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

// ── classifyCard ──────────────────────────────────────────────────
describe('classifyCard', () => {
  it('classifies insert / unchanged / update by hash', () => {
    const m = mapCard(card('sv1-1'), 'sv1');
    expect(classifyCard(new Map(), m)).toBe('insert');
    expect(classifyCard(new Map([['sv1-1', m.sourceHash]]), m)).toBe('unchanged');
    expect(classifyCard(new Map([['sv1-1', 'stale-hash']]), m)).toBe('update');
    expect(classifyCard(new Map([['sv1-1', null]]), m)).toBe('update');
  });
});
