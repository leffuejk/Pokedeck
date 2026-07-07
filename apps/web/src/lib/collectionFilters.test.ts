import { describe, it, expect } from 'vitest';
import { filterOwnedCards } from './collectionFilters';
import type { CollectionItemDTO } from '@pokedeck/shared';

function item(name: string, supertype: 'Pokémon' | 'Trainer' | 'Energy', types: string[] | null): CollectionItemDTO {
  return {
    cardId: name,
    quantity: 1,
    card: {
      id: name,
      setId: 'base1',
      name,
      supertype,
      subtypes: null,
      types,
      hp: null,
      rarity: null,
      regulationMark: null,
      smallImageUrl: null,
      largeImageUrl: null,
    },
  };
}

const ITEMS: CollectionItemDTO[] = [
  item('Pikachu', 'Pokémon', ['Lightning']),
  item('Charizard', 'Pokémon', ['Fire']),
  item('Professor Oak', 'Trainer', null),
  item('Fire Energy', 'Energy', ['Fire']),
];

describe('filterOwnedCards', () => {
  it('returns all cards when filters are empty', () => {
    const result = filterOwnedCards(ITEMS, { query: '', supertype: '', type: '' });
    expect(result).toHaveLength(4);
  });

  it('filters by name query (case-insensitive)', () => {
    const result = filterOwnedCards(ITEMS, { query: 'pika', supertype: '', type: '' });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Pikachu');
  });

  it('filters by supertype', () => {
    const result = filterOwnedCards(ITEMS, { query: '', supertype: 'Trainer', type: '' });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Professor Oak');
  });

  it('filters by type', () => {
    const result = filterOwnedCards(ITEMS, { query: '', supertype: '', type: 'Fire' });
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toContain('Charizard');
    expect(result.map((c) => c.name)).toContain('Fire Energy');
  });

  it('combines all three filters', () => {
    const result = filterOwnedCards(ITEMS, { query: 'char', supertype: 'Pokémon', type: 'Fire' });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Charizard');
  });

  it('returns empty array when no cards match', () => {
    const result = filterOwnedCards(ITEMS, { query: 'Mewtwo', supertype: '', type: '' });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const result = filterOwnedCards([], { query: '', supertype: '', type: '' });
    expect(result).toHaveLength(0);
  });
});
