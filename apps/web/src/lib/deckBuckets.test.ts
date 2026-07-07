import { describe, it, expect } from 'vitest';
import { groupDeckCardsByBucket } from './deckBuckets';
import type { CardSupertype, DeckCardDTO } from '@pokedeck/shared';

function deckCard(name: string, supertype: CardSupertype | string, quantity = 1): DeckCardDTO {
  return {
    cardId: name,
    quantity,
    zone: 'main',
    card: {
      id: name,
      setId: 'test',
      name,
      supertype: supertype as CardSupertype,
      subtypes: null,
      types: null,
      hp: null,
      rarity: null,
      regulationMark: null,
      smallImageUrl: null,
      largeImageUrl: null,
    },
  };
}

describe('groupDeckCardsByBucket', () => {
  it('returns empty buckets for empty input', () => {
    const result = groupDeckCardsByBucket([]);
    expect(result['Pokémon']).toHaveLength(0);
    expect(result.Trainer).toHaveLength(0);
    expect(result.Energy).toHaveLength(0);
    expect(result.Other).toHaveLength(0);
  });

  it('places Pokémon cards in the Pokémon bucket', () => {
    const result = groupDeckCardsByBucket([
      deckCard('Pikachu', 'Pokémon'),
      deckCard('Charizard', 'Pokémon', 2),
    ]);
    expect(result['Pokémon']).toHaveLength(2);
    expect(result.Trainer).toHaveLength(0);
    expect(result.Energy).toHaveLength(0);
    expect(result.Other).toHaveLength(0);
  });

  it('places Trainer cards in the Trainer bucket', () => {
    const result = groupDeckCardsByBucket([deckCard('Professor Oak', 'Trainer', 4)]);
    expect(result.Trainer).toHaveLength(1);
    expect(result['Pokémon']).toHaveLength(0);
    expect(result.Other).toHaveLength(0);
  });

  it('places Energy cards in the Energy bucket', () => {
    const result = groupDeckCardsByBucket([
      deckCard('Fire Energy', 'Energy', 4),
      deckCard('Water Energy', 'Energy', 4),
    ]);
    expect(result.Energy).toHaveLength(2);
    expect(result['Pokémon']).toHaveLength(0);
    expect(result.Other).toHaveLength(0);
  });

  it('places unknown supertypes in the Other bucket', () => {
    const result = groupDeckCardsByBucket([deckCard('Mystery Card', 'Unknown' as CardSupertype)]);
    expect(result.Other).toHaveLength(1);
    expect(result['Pokémon']).toHaveLength(0);
    expect(result.Trainer).toHaveLength(0);
    expect(result.Energy).toHaveLength(0);
  });

  it('groups a mixed deck correctly across all buckets', () => {
    const result = groupDeckCardsByBucket([
      deckCard('Pikachu', 'Pokémon', 4),
      deckCard('Charizard', 'Pokémon', 2),
      deckCard('Professor Oak', 'Trainer', 4),
      deckCard('Potion', 'Trainer', 4),
      deckCard('Fire Energy', 'Energy', 10),
    ]);
    expect(result['Pokémon']).toHaveLength(2);
    expect(result.Trainer).toHaveLength(2);
    expect(result.Energy).toHaveLength(1);
    expect(result.Other).toHaveLength(0);
  });

  it('preserves quantity values on bucketed cards', () => {
    const result = groupDeckCardsByBucket([deckCard('Pikachu', 'Pokémon', 3)]);
    expect(result['Pokémon'][0]!.quantity).toBe(3);
  });
});
