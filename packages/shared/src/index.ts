/**
 * @pokedeck/shared — the API contract shared by the web app and the API service.
 * Keep this framework-free (no fastify/react imports) so both sides can depend on it.
 */

// ── Domain enums (mirror the DB enums in apps/api/src/db/schema.ts) ──
export const CARD_SUPERTYPES = ['Pokémon', 'Trainer', 'Energy'] as const;
export type CardSupertype = (typeof CARD_SUPERTYPES)[number];

export const DECK_FORMATS = ['standard', 'expanded', 'unlimited', 'glc'] as const;
export type DeckFormat = (typeof DECK_FORMATS)[number];

export const PLAYSTYLES = [
  'aggro',
  'control',
  'combo',
  'midrange',
  'mill',
  'toolbox',
  'stall',
] as const;
export type Playstyle = (typeof PLAYSTYLES)[number];

// The 11 canonical Pokémon TCG energy/card types (used for UI theming & filters).
export const POKEMON_TYPES = [
  'Grass',
  'Fire',
  'Water',
  'Lightning',
  'Psychic',
  'Fighting',
  'Darkness',
  'Metal',
  'Fairy',
  'Dragon',
  'Colorless',
] as const;
export type PokemonType = (typeof POKEMON_TYPES)[number];

// ── DTOs ──
export interface CardDTO {
  id: string;
  setId: string;
  name: string;
  supertype: CardSupertype;
  subtypes: string[] | null;
  types: string[] | null;
  hp: number | null;
  rarity: string | null;
  regulationMark: string | null;
  smallImageUrl: string | null;
  largeImageUrl: string | null;
}

export interface CollectionItemDTO {
  cardId: string;
  quantity: number;
  card: CardDTO;
}

export interface DeckCardDTO {
  cardId: string;
  quantity: number;
  zone: 'main' | 'sideboard';
  card: CardDTO;
}

export interface DeckDTO {
  id: string;
  name: string;
  description: string | null;
  format: DeckFormat;
  primaryTypes: string[] | null;
  coverCardId: string | null;
  cardCount: number;
  updatedAt: string;
}

export interface DeckDetailDTO extends DeckDTO {
  cards: DeckCardDTO[];
}

export interface DeckScoreBreakdown {
  consistency: number;
  energyBalance: number;
  typeCoverage: number;
  speed: number;
  resilience: number;
  techFlexibility: number;
}

export interface Recommendation {
  action: 'add' | 'remove' | 'swap' | 'acquire';
  cardId?: string;
  cardName?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MissingCard {
  cardId: string;
  cardName: string;
  reason: string;
  ownedElsewhere: boolean;
}

export interface DeckAnalysisDTO {
  id: string;
  deckId: string;
  overallScore: number | null;
  scores: DeckScoreBreakdown | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: Recommendation[] | null;
  missingCards: MissingCard[] | null;
  suggestedArchetypeId: string | null;
  createdAt: string;
}

export interface ArchetypeDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  playstyle: Playstyle | null;
  typicalTypes: string[] | null;
}

// ── Request bodies ──
export interface UpsertCollectionItemBody {
  cardId: string;
  quantity: number;
}

export interface CreateDeckBody {
  name: string;
  format?: DeckFormat;
  description?: string;
}

export interface UpdateDeckCardBody {
  cardId: string;
  quantity: number;
  zone?: 'main' | 'sideboard';
}

export interface CoachMessageBody {
  threadId?: string;
  deckId?: string;
  message: string;
}

// ── Generic API envelope ──
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const STANDARD_DECK_SIZE = 60;
export const MAX_COPIES_PER_CARD = 4;
