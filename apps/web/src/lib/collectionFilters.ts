import type { CardDTO, CollectionItemDTO } from '@pokedeck/shared';

export function filterOwnedCards(
  items: CollectionItemDTO[],
  filters: { query: string; supertype: string; type: string },
): CardDTO[] {
  return items
    .filter((item) => {
      if (filters.query && !item.card.name.toLowerCase().includes(filters.query.toLowerCase())) return false;
      if (filters.supertype && item.card.supertype !== filters.supertype) return false;
      if (filters.type && !(item.card.types ?? []).includes(filters.type)) return false;
      return true;
    })
    .map((item) => item.card);
}
