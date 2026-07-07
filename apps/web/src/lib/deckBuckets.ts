import type { DeckCardDTO } from '@pokedeck/shared';

export const DECK_BUCKETS = ['Pokémon', 'Trainer', 'Energy', 'Other'] as const;
export type DeckBucket = (typeof DECK_BUCKETS)[number];

export function groupDeckCardsByBucket(cards: DeckCardDTO[]): Record<DeckBucket, DeckCardDTO[]> {
  const groups: Record<DeckBucket, DeckCardDTO[]> = {
    'Pokémon': [],
    Trainer: [],
    Energy: [],
    Other: [],
  };
  for (const dc of cards) {
    const st = dc.card.supertype;
    const bucket: DeckBucket =
      st === 'Pokémon' || st === 'Trainer' || st === 'Energy' ? st : 'Other';
    groups[bucket].push(dc);
  }
  return groups;
}
