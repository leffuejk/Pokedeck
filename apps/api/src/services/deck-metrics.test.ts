import { describe, it, expect } from 'vitest';
import { computeDeckMetrics, type DeckEntry } from './deck-metrics.js';

type CardLike = {
  name: string;
  supertype: 'Pokémon' | 'Trainer' | 'Energy';
  subtypes?: string[] | null;
  types?: string[] | null;
};

function entry(card: CardLike, quantity: number): DeckEntry {
  return { card: card as DeckEntry['card'], quantity };
}

describe('computeDeckMetrics', () => {
  it('returns zeros for an empty deck', () => {
    const m = computeDeckMetrics([]);
    expect(m.total).toBe(0);
    expect(m.pokemonCount).toBe(0);
    expect(m.trainerCount).toBe(0);
    expect(m.energyCount).toBe(0);
  });

  it('counts cards by supertype and totals them', () => {
    const m = computeDeckMetrics([
      entry({ name: 'Charizard', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Fire'] }, 3),
      entry({ name: 'Iono', supertype: 'Trainer' }, 4),
      entry({ name: 'Fire Energy', supertype: 'Energy' }, 8),
    ]);
    expect(m.pokemonCount).toBe(3);
    expect(m.trainerCount).toBe(4);
    expect(m.energyCount).toBe(8);
    expect(m.total).toBe(15);
  });

  it('counts Basic Pokémon separately from non-basic', () => {
    const m = computeDeckMetrics([
      entry({ name: 'Charmander', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Fire'] }, 4),
      entry({ name: 'Charmeleon', supertype: 'Pokémon', subtypes: ['Stage 1'], types: ['Fire'] }, 3),
    ]);
    expect(m.basicPokemonCount).toBe(4);
    expect(m.pokemonCount).toBe(7);
  });

  it('recognises draw supporters by name hints', () => {
    const m = computeDeckMetrics([
      entry({ name: "Professor's Research", supertype: 'Trainer' }, 4),
      entry({ name: 'Iono', supertype: 'Trainer' }, 4),
      entry({ name: 'Switch', supertype: 'Trainer' }, 4),
    ]);
    // "Professor's Research" matches "Research" hint; "Iono" matches "Iono" hint; "Switch" doesn't match
    expect(m.drawSupporterCount).toBe(8);
  });

  it('accumulates typeCounts from Pokémon types', () => {
    const m = computeDeckMetrics([
      entry({ name: 'Pikachu', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Lightning'] }, 4),
      entry({ name: 'Charizard', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Fire'] }, 4),
    ]);
    expect(m.typeCounts).toEqual({ Lightning: 4, Fire: 4 });
  });

  it('scores typeCoverage 90 for ≤2 types and 45 for ≥4 types', () => {
    const twoType = [
      entry({ name: 'A', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Fire'] }, 1),
      entry({ name: 'B', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Water'] }, 1),
    ];
    expect(computeDeckMetrics(twoType).scores.typeCoverage).toBe(90);

    const fourType = [
      entry({ name: 'A', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Fire'] }, 1),
      entry({ name: 'B', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Water'] }, 1),
      entry({ name: 'C', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Grass'] }, 1),
      entry({ name: 'D', supertype: 'Pokémon', subtypes: ['Basic'], types: ['Lightning'] }, 1),
    ];
    expect(computeDeckMetrics(fourType).scores.typeCoverage).toBe(45);
  });

  it('scores energyBalance 100 for energy count in the sweet spot (9–15)', () => {
    const m = computeDeckMetrics([entry({ name: 'Fire Energy', supertype: 'Energy' }, 12)]);
    expect(m.scores.energyBalance).toBe(100);
  });

  it('overall equals the documented weighted average of sub-scores', () => {
    const m = computeDeckMetrics([]);
    const expected =
      Math.round(
        (m.scores.consistency * 0.3 +
          m.scores.energyBalance * 0.2 +
          m.scores.typeCoverage * 0.15 +
          m.scores.speed * 0.15 +
          m.scores.resilience * 0.15 +
          m.scores.techFlexibility * 0.05) *
          10,
      ) / 10;
    expect(m.overall).toBe(expected);
  });
});
