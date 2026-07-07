import type { PokemonType } from '@pokedeck/shared';

export interface TypeTheme {
  /** Primary brand color for the energy type. */
  color: string;
  /** A softer tint suitable for backgrounds. */
  soft: string;
  /** Readable foreground color to place on top of `color`. */
  on: string;
  /** A single emoji glyph used as a friendly type icon. */
  glyph: string;
}

/**
 * The 11 canonical Pokémon TCG energy types mapped to a tasteful, vibrant palette.
 * Keyed off @pokedeck/shared's POKEMON_TYPES so it stays in sync with the contract.
 */
export const TYPE_THEME: Record<PokemonType, TypeTheme> = {
  Grass: { color: '#78C850', soft: '#e7f6da', on: '#173d0a', glyph: '🍃' },
  Fire: { color: '#F08030', soft: '#fde7d6', on: '#4a1c02', glyph: '🔥' },
  Water: { color: '#6890F0', soft: '#dce6fd', on: '#0b2455', glyph: '💧' },
  Lightning: { color: '#F8D030', soft: '#fdf4cc', on: '#4a3c02', glyph: '⚡' },
  Psychic: { color: '#F85888', soft: '#fdd9e5', on: '#4d0a24', glyph: '🔮' },
  Fighting: { color: '#C03028', soft: '#f6d7d4', on: '#40100c', glyph: '🥊' },
  Darkness: { color: '#5B5466', soft: '#dedbe3', on: '#f5f4f7', glyph: '🌑' },
  Metal: { color: '#8A8FA0', soft: '#e2e4ea', on: '#1e2029', glyph: '⚙️' },
  Fairy: { color: '#EE99AC', soft: '#fbe4ea', on: '#4d1626', glyph: '✨' },
  Dragon: { color: '#7038F8', soft: '#e0d5fe', on: '#1c0a4d', glyph: '🐉' },
  Colorless: { color: '#A8A878', soft: '#ececdf', on: '#33331f', glyph: '⭐' },
};

const FALLBACK: TypeTheme = { color: '#94A3B8', soft: '#e2e8f0', on: '#0f172a', glyph: '❔' };

/** Neutral themes for card supertypes (Trainer/Energy) that have no energy type. */
const SUPERTYPE_THEME: Record<string, TypeTheme> = {
  Trainer: { color: '#64748B', soft: '#f1f5f9', on: '#0f172a', glyph: 'T' },
  Energy: { color: '#64748B', soft: '#f1f5f9', on: '#0f172a', glyph: 'E' },
  Other: { color: '#94A3B8', soft: '#e2e8f0', on: '#0f172a', glyph: '?' },
};

/** Safe lookup that tolerates arbitrary strings coming off the API. */
export function typeTheme(type: string | null | undefined): TypeTheme {
  if (!type) return FALLBACK;
  return TYPE_THEME[type as PokemonType] ?? SUPERTYPE_THEME[type] ?? FALLBACK;
}

/** Build a soft multi-color gradient for a card's set of types. */
export function typesGradient(types: string[] | null | undefined): string {
  const list = (types && types.length ? types : ['Colorless']).map((t) => typeTheme(t).color);
  if (list.length === 1) return `linear-gradient(135deg, ${list[0]}, ${list[0]}cc)`;
  return `linear-gradient(135deg, ${list.join(', ')})`;
}
