import type { CardDTO, CardDetailDTO } from '@pokedeck/shared';
import type { cards } from '../db/schema.js';

type CardRow = typeof cards.$inferSelect;

export function toDTO(c: CardRow): CardDTO {
  return {
    id: c.id,
    setId: c.setId,
    name: c.name,
    supertype: c.supertype,
    subtypes: c.subtypes,
    types: c.types,
    hp: c.hp,
    rarity: c.rarity,
    regulationMark: c.regulationMark,
    smallImageUrl: c.smallImageUrl,
    largeImageUrl: c.largeImageUrl,
  };
}

export function toCardDetailDTO(c: CardRow): CardDetailDTO {
  return {
    ...toDTO(c),
    evolvesFrom: c.evolvesFrom ?? null,
    evolvesTo: c.evolvesTo ?? null,
    abilities: (c.abilities as CardDetailDTO['abilities']) ?? null,
    attacks: (c.attacks as CardDetailDTO['attacks']) ?? null,
    weaknesses: (c.weaknesses as CardDetailDTO['weaknesses']) ?? null,
    resistances: (c.resistances as CardDetailDTO['resistances']) ?? null,
    retreatCost: c.retreatCost ?? null,
    convertedRetreatCost: c.convertedRetreatCost ?? null,
    flavorText: c.flavorText ?? null,
    legalities: (c.legalities as CardDetailDTO['legalities']) ?? null,
  };
}
