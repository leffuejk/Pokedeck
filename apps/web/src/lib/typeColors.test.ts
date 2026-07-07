import { describe, it, expect } from 'vitest';
import { typeTheme, typesGradient, TYPE_THEME } from './typeColors';
import { POKEMON_TYPES } from '@pokedeck/shared';

describe('typeTheme', () => {
  it('returns the correct theme for every canonical Pokémon type', () => {
    for (const t of POKEMON_TYPES) {
      const theme = typeTheme(t);
      expect(theme).toBe(TYPE_THEME[t]);
      expect(theme.color).toBeTruthy();
      expect(theme.glyph).toBeTruthy();
    }
  });

  it('returns the Trainer neutral theme for "Trainer"', () => {
    const theme = typeTheme('Trainer');
    expect(theme.glyph).toBe('T');
    expect(theme.soft).toBeTruthy();
  });

  it('returns the Energy neutral theme for "Energy"', () => {
    const theme = typeTheme('Energy');
    expect(theme.glyph).toBe('E');
    expect(theme.soft).toBeTruthy();
  });

  it('returns the Other neutral theme for "Other"', () => {
    const theme = typeTheme('Other');
    expect(theme.glyph).toBe('?');
  });

  it('returns FALLBACK for null', () => {
    const theme = typeTheme(null);
    expect(theme.glyph).toBe('❔');
  });

  it('returns FALLBACK for undefined', () => {
    const theme = typeTheme(undefined);
    expect(theme.glyph).toBe('❔');
  });

  it('returns FALLBACK for an unknown type string', () => {
    const theme = typeTheme('UnknownType');
    expect(theme.glyph).toBe('❔');
  });
});

describe('typesGradient', () => {
  it('produces a single-color gradient for a single type', () => {
    const gradient = typesGradient(['Fire']);
    expect(gradient).toMatch(/linear-gradient/);
    expect(gradient).toContain(TYPE_THEME.Fire.color);
  });

  it('produces a multi-color gradient for multiple types', () => {
    const gradient = typesGradient(['Water', 'Lightning']);
    expect(gradient).toContain(TYPE_THEME.Water.color);
    expect(gradient).toContain(TYPE_THEME.Lightning.color);
  });

  it('falls back to Colorless gradient for null', () => {
    const gradient = typesGradient(null);
    expect(gradient).toContain(TYPE_THEME.Colorless.color);
  });

  it('falls back to Colorless gradient for empty array', () => {
    const gradient = typesGradient([]);
    expect(gradient).toContain(TYPE_THEME.Colorless.color);
  });
});
