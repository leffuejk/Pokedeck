import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeDeck } from './deck-coach.js';
import type { DeckEntry } from './deck-metrics.js';
import * as foundryModule from './foundry.js';

vi.mock('./foundry.js', () => ({
  getFoundry: vi.fn(),
}));

type CardLike = {
  name: string;
  supertype: 'Pokémon' | 'Trainer' | 'Energy';
  subtypes?: string[] | null;
  types?: string[] | null;
};

function e(
  name: string,
  supertype: CardLike['supertype'],
  quantity: number,
  subtypes?: string[],
  types?: string[],
): DeckEntry {
  return {
    card: { name, supertype, subtypes: subtypes ?? null, types: types ?? null } as DeckEntry['card'],
    quantity,
  };
}

/**
 * 60-card deck that passes all basic heuristic checks:
 * - 10 basics (>= 6)
 * - 12 energy (9-15 range)
 * - 8 draw supporters (>= 6)
 * - 33 trainers (24-34 range)
 * - 3 types (<= 3)
 */
function balancedDeck(): DeckEntry[] {
  return [
    e('Salamence V', 'Pokémon', 4, ['Basic'], ['Water']),
    e('Salamence VMAX', 'Pokémon', 3, ['VMAX'], ['Water']),
    e('Bidoof', 'Pokémon', 3, ['Basic'], ['Colorless']),
    e('Bibarel', 'Pokémon', 2, ['Stage 1'], ['Colorless']),
    e('Crobat V', 'Pokémon', 2, ['Basic'], ['Psychic']),
    e('Lumineon V', 'Pokémon', 1, ['Basic'], ['Water']),
    e("Professor's Research", 'Trainer', 4),
    e('Iono', 'Trainer', 4),
    e("Boss's Orders", 'Trainer', 3),
    e('Ultra Ball', 'Trainer', 4),
    e('Quick Ball', 'Trainer', 4),
    e('Path to the Peak', 'Trainer', 3),
    e('Switch', 'Trainer', 3),
    e('Nest Ball', 'Trainer', 4),
    e('Choice Belt', 'Trainer', 2),
    e('Collapsed Stadium', 'Trainer', 2),
    e('Water Energy', 'Energy', 12),
  ];
}

describe('analyzeDeck – heuristic path (no Foundry)', () => {
  beforeEach(() => {
    vi.mocked(foundryModule.getFoundry).mockResolvedValue(null);
  });

  it('always produces 1–4 recommendations, even for a well-built deck', async () => {
    const result = await analyzeDeck(balancedDeck(), 'Water Salamence V');
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations.length).toBeLessThanOrEqual(4);
  });

  it('recommendations are ordered high → medium → low priority', async () => {
    // Deck with energy < 9 (high) and type spread > 3 (low)
    const deck = [
      e('Salamence V', 'Pokémon', 2, ['Basic'], ['Water']),
      e('Charizard', 'Pokémon', 2, ['Basic'], ['Fire']),
      e('Raichu', 'Pokémon', 2, ['Basic'], ['Lightning']),
      e('Gardevoir', 'Pokémon', 2, ['Basic'], ['Psychic']),
      e("Professor's Research", 'Trainer', 4),
      e('Iono', 'Trainer', 4),
      e('Ultra Ball', 'Trainer', 4),
      e('Quick Ball', 'Trainer', 4),
      e('Switch', 'Trainer', 4),
      e("Boss's Orders", 'Trainer', 4),
      e('Nest Ball', 'Trainer', 4),
      e('Path to the Peak', 'Trainer', 4),
      e('Water Energy', 'Energy', 6),
      e('Fire Energy', 'Energy', 2),
    ];
    const result = await analyzeDeck(deck, 'Multi-type');
    const ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(ORDER[result.recommendations[i].priority]).toBeGreaterThanOrEqual(
        ORDER[result.recommendations[i - 1].priority],
      );
    }
  });

  it('summary does not contain praise-only filler', async () => {
    const result = await analyzeDeck(balancedDeck(), 'Water Salamence V');
    expect(result.summary.toLowerCase()).not.toMatch(/keep tuning|it will shine|championship-ready.*shine/);
  });

  it('flags low energy as a high-priority add recommendation', async () => {
    const deck = [
      e('Salamence V', 'Pokémon', 6, ['Basic'], ['Water']),
      e("Professor's Research", 'Trainer', 4),
      e('Iono', 'Trainer', 4),
      e('Ultra Ball', 'Trainer', 4),
      e('Quick Ball', 'Trainer', 4),
      e('Switch', 'Trainer', 4),
      e("Boss's Orders", 'Trainer', 4),
      e('Nest Ball', 'Trainer', 4),
      e('Water Energy', 'Energy', 5), // < 9
    ];
    const result = await analyzeDeck(deck, 'Low Energy');
    const rec = result.recommendations.find(
      (r) => r.priority === 'high' && r.action === 'add' && r.reason.includes('energy'),
    );
    expect(rec).toBeDefined();
    expect(rec?.reason).toMatch(/5/); // references actual count
  });

  it('flags low draw supporters as a recommendation', async () => {
    const deck = [
      e('Salamence V', 'Pokémon', 6, ['Basic'], ['Water']),
      e('Iono', 'Trainer', 2), // only 2 draw supporters
      e('Ultra Ball', 'Trainer', 4),
      e('Quick Ball', 'Trainer', 4),
      e('Switch', 'Trainer', 4),
      e("Boss's Orders", 'Trainer', 4),
      e('Water Energy', 'Energy', 12),
    ];
    const result = await analyzeDeck(deck, 'Low Draw');
    const rec = result.recommendations.find((r) => r.reason.toLowerCase().includes('draw'));
    expect(rec).toBeDefined();
  });

  it('flags incomplete deck as high-priority', async () => {
    const result = await analyzeDeck(
      [e('Salamence V', 'Pokémon', 4, ['Basic'], ['Water'])],
      'Tiny Deck',
    );
    const rec = result.recommendations.find(
      (r) => r.priority === 'high' && r.reason.includes('4/60'),
    );
    expect(rec).toBeDefined();
  });

  it('model is "heuristic" when Foundry is null', async () => {
    const result = await analyzeDeck(balancedDeck(), 'Test');
    expect(result.model).toBe('heuristic');
  });
});

describe('analyzeDeck – LLM path (Foundry available)', () => {
  it('returns recommendations from LLM response', async () => {
    const mockComplete = vi.fn().mockResolvedValue(
      JSON.stringify({
        summary: 'Solid Water deck with a clear win condition.',
        strengths: ['Good draw engine'],
        weaknesses: ['Thin attack line'],
        recommendations: [
          {
            action: 'add',
            cardName: 'Radiant Greninja',
            reason: 'Provides draw-on-attack synergy your deck currently lacks.',
            priority: 'high',
          },
        ],
        missingCards: [],
      }),
    );
    vi.mocked(foundryModule.getFoundry).mockResolvedValue({ complete: mockComplete } as any);

    const result = await analyzeDeck(balancedDeck(), 'Test Deck');
    expect(result.model).toBe('foundry');
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].cardName).toBe('Radiant Greninja');
  });

  it('falls back to heuristic with at least 1 recommendation when LLM throws', async () => {
    vi.mocked(foundryModule.getFoundry).mockResolvedValue({
      complete: vi.fn().mockRejectedValue(new Error('API error')),
    } as any);

    const result = await analyzeDeck(balancedDeck(), 'Test Deck');
    expect(result.model).toBe('heuristic');
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });
});
