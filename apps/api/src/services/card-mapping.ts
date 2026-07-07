/**
 * Pure mapping between the source card/set JSON and our DB row shapes.
 * No DB, env, or network imports — safe to unit-test directly.
 */
import { createHash } from 'node:crypto';
import type { CardSupertype } from '@pokedeck/shared';
import type { Ability, Attack, Legalities, TypeMod } from '../db/schema.js';
import type { SourceCard, SourceSet } from './pokemon-tcg-data.js';

const KNOWN_SUPERTYPES: Record<string, CardSupertype> = {
  'Pokémon': 'Pokémon',
  Pokemon: 'Pokémon',
  Trainer: 'Trainer',
  Energy: 'Energy',
};

/** Unknown/future supertypes bucket into 'Other' rather than being dropped (CLAUDE.md). */
export function bucketSupertype(supertype: string): CardSupertype {
  return KNOWN_SUPERTYPES[supertype] ?? 'Other';
}

/**
 * Stable content hash of the source card, used to classify insert/update/unchanged.
 * Hashes the *source* payload only (never our derived columns like updatedAt), so a
 * rerun with identical source data produces an identical hash → "unchanged".
 */
export function computeSourceHash(card: SourceCard): string {
  return createHash('sha256').update(JSON.stringify(card)).digest('hex');
}

export function mapSet(s: SourceSet) {
  return {
    id: s.id,
    name: s.name,
    series: s.series ?? null,
    printedTotal: s.printedTotal ?? null,
    total: s.total ?? null,
    ptcgoCode: s.ptcgoCode ?? null,
    releaseDate: s.releaseDate ?? null,
    symbolImageUrl: s.images?.symbol ?? null,
    logoImageUrl: s.images?.logo ?? null,
    legalities: s.legalities ?? null,
    updatedAt: new Date(),
  };
}

/** Map a source card + its set id to a `cards` row. `setId` comes from context
 *  because the repo's per-set files omit the API's embedded `set` object. */
export function mapCard(c: SourceCard, setId: string) {
  return {
    id: c.id,
    setId,
    name: c.name,
    supertype: bucketSupertype(c.supertype),
    subtypes: c.subtypes ?? null,
    types: c.types ?? null,
    hp: c.hp ? Number.parseInt(c.hp, 10) || null : null,
    number: c.number ?? null,
    rarity: c.rarity ?? null,
    regulationMark: c.regulationMark ?? null,
    nationalPokedexNumbers: c.nationalPokedexNumbers ?? null,
    evolvesFrom: c.evolvesFrom ?? null,
    evolvesTo: c.evolvesTo ?? null,
    abilities: (c.abilities as Ability[] | undefined) ?? null,
    attacks: (c.attacks as Attack[] | undefined) ?? null,
    weaknesses: (c.weaknesses as TypeMod[] | undefined) ?? null,
    resistances: (c.resistances as TypeMod[] | undefined) ?? null,
    retreatCost: c.retreatCost ?? null,
    convertedRetreatCost: c.convertedRetreatCost ?? null,
    flavorText: c.flavorText ?? null,
    artist: c.artist ?? null,
    smallImageUrl: c.images?.small ?? null,
    largeImageUrl: c.images?.large ?? null,
    legalities: (c.legalities as Legalities | undefined) ?? null,
    legalityStandard: c.legalities?.standard ?? null,
    legalityExpanded: c.legalities?.expanded ?? null,
    raw: c as unknown,
    sourceHash: computeSourceHash(c),
    updatedAt: new Date(),
  };
}

export type MappedSet = ReturnType<typeof mapSet>;
export type MappedCard = ReturnType<typeof mapCard>;

/** Classify a single card against the previously-synced hash map. */
export function classifyCard(
  existing: Map<string, string | null>,
  card: MappedCard,
): 'insert' | 'update' | 'unchanged' {
  if (!existing.has(card.id)) return 'insert';
  return existing.get(card.id) === card.sourceHash ? 'unchanged' : 'update';
}
