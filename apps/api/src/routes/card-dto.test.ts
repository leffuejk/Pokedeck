import { describe, it, expect } from 'vitest';
import { toDTO, toCardDetailDTO } from './card-dto.js';
import type { Card } from '../db/schema.js';

const fullRow = {
  id: 'sv1-1',
  setId: 'sv1',
  name: 'Bulbasaur',
  supertype: 'Pokémon' as const,
  subtypes: ['Basic'],
  types: ['Grass'],
  hp: 70,
  number: '1',
  rarity: 'Common',
  regulationMark: 'H',
  nationalPokedexNumbers: [1],
  evolvesFrom: null,
  evolvesTo: ['Ivysaur'],
  abilities: [{ name: 'Overgrow', text: 'Once per turn…', type: 'Ability' }],
  attacks: [{ name: 'Vine Whip', cost: ['Grass', 'Colorless'], convertedEnergyCost: 2, damage: '40', text: '' }],
  weaknesses: [{ type: 'Fire', value: '×2' }],
  resistances: [],
  retreatCost: ['Colorless'],
  convertedRetreatCost: 1,
  flavorText: 'A strange seed was planted on its back at birth.',
  artist: 'Ken Sugimori',
  smallImageUrl: 'https://img/sv1-1-sm.png',
  largeImageUrl: 'https://img/sv1-1.png',
  legalities: { standard: 'Legal', expanded: 'Legal' },
  legalityStandard: 'Legal',
  legalityExpanded: 'Legal',
  raw: null,
  sourceHash: 'abc123',
  updatedAt: new Date(),
};

describe('toCardDetailDTO — detail data retrieval', () => {
  it('maps all structured columns to the detail DTO', () => {
    const dto = toCardDetailDTO(fullRow as unknown as Card);

    expect(dto.id).toBe('sv1-1');
    expect(dto.name).toBe('Bulbasaur');
    expect(dto.attacks).toHaveLength(1);
    const attack = dto.attacks![0]!;
    expect(attack.name).toBe('Vine Whip');
    expect(attack.cost).toEqual(['Grass', 'Colorless']);
    expect(attack.damage).toBe('40');
    expect(dto.abilities).toHaveLength(1);
    expect(dto.abilities![0]!.name).toBe('Overgrow');
    expect(dto.weaknesses).toHaveLength(1);
    expect(dto.weaknesses![0]!.type).toBe('Fire');
    expect(dto.evolvesTo).toEqual(['Ivysaur']);
    expect(dto.retreatCost).toEqual(['Colorless']);
    expect(dto.flavorText).toBe('A strange seed was planted on its back at birth.');
    expect(dto.legalities?.standard).toBe('Legal');
  });

  it('includes base CardDTO fields', () => {
    const dto = toCardDetailDTO(fullRow as unknown as Card);
    const base = toDTO(fullRow as unknown as Card);

    expect(dto.id).toBe(base.id);
    expect(dto.hp).toBe(base.hp);
    expect(dto.smallImageUrl).toBe(base.smallImageUrl);
  });
});

describe('toCardDetailDTO — missing-card-detail path', () => {
  it('returns null for all optional detail fields when the card row has no extras', () => {
    const minimalRow = {
      id: 'trainer-99',
      setId: 'sv1',
      name: 'Poké Ball',
      supertype: 'Trainer' as const,
      subtypes: null,
      types: null,
      hp: null,
      number: '99',
      rarity: null,
      regulationMark: null,
      nationalPokedexNumbers: null,
      evolvesFrom: null,
      evolvesTo: null,
      abilities: null,
      attacks: null,
      weaknesses: null,
      resistances: null,
      retreatCost: null,
      convertedRetreatCost: null,
      flavorText: null,
      artist: null,
      smallImageUrl: null,
      largeImageUrl: null,
      legalities: null,
      legalityStandard: null,
      legalityExpanded: null,
      raw: null,
      sourceHash: null,
      updatedAt: new Date(),
    };

    const dto = toCardDetailDTO(minimalRow as unknown as Card);

    expect(dto.attacks).toBeNull();
    expect(dto.abilities).toBeNull();
    expect(dto.weaknesses).toBeNull();
    expect(dto.resistances).toBeNull();
    expect(dto.retreatCost).toBeNull();
    expect(dto.evolvesFrom).toBeNull();
    expect(dto.evolvesTo).toBeNull();
    expect(dto.flavorText).toBeNull();
    expect(dto.legalities).toBeNull();
  });
});
