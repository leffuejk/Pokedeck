/**
 * Pokedeck database schema (Drizzle ORM / PostgreSQL).
 *
 * Organized by domain group: Identity (Auth.js) → Card reference → Collection →
 * Decks → Strategy → AI → Ops. See docs/data-model.md for the ERD and rationale.
 */
import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from '@auth/core/adapters';

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────
// 'Other' buckets any unknown/future supertype rather than dropping it (CLAUDE.md).
export const cardSupertype = pgEnum('card_supertype', ['Pokémon', 'Trainer', 'Energy', 'Other']);
export const deckFormat = pgEnum('deck_format', ['standard', 'expanded', 'unlimited', 'glc']);
export const deckZone = pgEnum('deck_zone', ['main', 'sideboard']);
export const playstyle = pgEnum('playstyle', [
  'aggro',
  'control',
  'combo',
  'midrange',
  'mill',
  'toolbox',
  'stall',
]);
export const coachRole = pgEnum('coach_role', ['user', 'assistant', 'system', 'tool']);
export const syncStatus = pgEnum('sync_status', ['running', 'succeeded', 'failed']);

// ─────────────────────────────────────────────────────────────
// Identity — Auth.js (self-hosted) Drizzle adapter contract
// ─────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const authenticators = pgTable(
  'authenticators',
  {
    credentialID: text('credential_id').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('provider_account_id').notNull(),
    credentialPublicKey: text('credential_public_key').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credential_device_type').notNull(),
    credentialBackedUp: boolean('credential_backed_up').notNull(),
    transports: text('transports'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.credentialID] })],
);

// ─────────────────────────────────────────────────────────────
// Card reference — cached mirror of the Pokémon TCG API
// ─────────────────────────────────────────────────────────────
export const sets = pgTable('sets', {
  id: text('id').primaryKey(), // pokemontcg.io set id, e.g. "sv1"
  name: text('name').notNull(),
  series: text('series'),
  printedTotal: integer('printed_total'),
  total: integer('total'),
  ptcgoCode: text('ptcgo_code'),
  releaseDate: text('release_date'), // API returns YYYY/MM/DD
  symbolImageUrl: text('symbol_image_url'),
  logoImageUrl: text('logo_image_url'),
  legalities: jsonb('legalities').$type<Legalities>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cards = pgTable(
  'cards',
  {
    id: text('id').primaryKey(), // pokemontcg.io card id, e.g. "sv1-1"
    setId: text('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    supertype: cardSupertype('supertype').notNull(),
    subtypes: text('subtypes').array(), // e.g. ["Basic","ex"]
    types: text('types').array(), // e.g. ["Fire"]
    hp: integer('hp'),
    number: text('number'),
    rarity: text('rarity'),
    regulationMark: text('regulation_mark'), // e.g. "H"
    nationalPokedexNumbers: integer('national_pokedex_numbers').array(),
    evolvesFrom: text('evolves_from'),
    evolvesTo: text('evolves_to').array(),
    abilities: jsonb('abilities').$type<Ability[]>(),
    attacks: jsonb('attacks').$type<Attack[]>(),
    weaknesses: jsonb('weaknesses').$type<TypeMod[]>(),
    resistances: jsonb('resistances').$type<TypeMod[]>(),
    retreatCost: text('retreat_cost').array(),
    convertedRetreatCost: integer('converted_retreat_cost'),
    flavorText: text('flavor_text'),
    artist: text('artist'),
    smallImageUrl: text('small_image_url'),
    largeImageUrl: text('large_image_url'),
    legalities: jsonb('legalities').$type<Legalities>(),
    // Promoted legality columns for fast, indexable format filtering (values:
    // 'Legal' | 'Banned' | null). Backfilled from `legalities` and kept in sync.
    legalityStandard: text('legality_standard'),
    legalityExpanded: text('legality_expanded'),
    raw: jsonb('raw'), // complete source card JSON — authoritative, lossless
    // sha256 of the source payload; lets the sync classify insert/update/unchanged
    // and skip writes for unchanged cards.
    sourceHash: text('source_hash'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('cards_name_idx').on(t.name),
    index('cards_set_idx').on(t.setId),
    index('cards_supertype_idx').on(t.supertype),
    index('cards_types_idx').using('gin', t.types),
    index('cards_dex_idx').using('gin', t.nationalPokedexNumbers),
    index('cards_legality_standard_idx').on(t.legalityStandard),
  ],
);

// ─────────────────────────────────────────────────────────────
// Collection — the cards a user owns
// ─────────────────────────────────────────────────────────────
export const collectionItems = pgTable(
  'collection_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    condition: text('condition'),
    notes: text('notes'),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('collection_user_card_uq').on(t.userId, t.cardId),
    index('collection_user_idx').on(t.userId),
  ],
);

// ─────────────────────────────────────────────────────────────
// Strategy — curated + AI-known archetypes
// ─────────────────────────────────────────────────────────────
export const archetypes = pgTable('archetypes', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  playstyle: playstyle('playstyle'),
  keyCardIds: text('key_card_ids').array(),
  signaturePokedexNumbers: integer('signature_pokedex_numbers').array(),
  typicalTypes: text('typical_types').array(),
  notes: text('notes'),
  isCurated: boolean('is_curated').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// Decks
// ─────────────────────────────────────────────────────────────
export const decks = pgTable(
  'decks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    format: deckFormat('format').notNull().default('standard'),
    archetypeId: uuid('archetype_id').references(() => archetypes.id, { onDelete: 'set null' }),
    primaryTypes: text('primary_types').array(),
    coverCardId: text('cover_card_id').references(() => cards.id, { onDelete: 'set null' }),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('decks_user_idx').on(t.userId)],
);

export const deckCards = pgTable(
  'deck_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    zone: deckZone('zone').notNull().default('main'),
  },
  (t) => [
    uniqueIndex('deck_cards_deck_card_zone_uq').on(t.deckId, t.cardId, t.zone),
    index('deck_cards_deck_idx').on(t.deckId),
  ],
);

// ─────────────────────────────────────────────────────────────
// AI — persisted Foundry agent output & conversations
// ─────────────────────────────────────────────────────────────
export const deckAnalyses = pgTable(
  'deck_analyses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    model: text('model'),
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
    scores: jsonb('scores').$type<DeckScoreBreakdown>(),
    summary: text('summary'),
    strengths: jsonb('strengths').$type<string[]>(),
    weaknesses: jsonb('weaknesses').$type<string[]>(),
    recommendations: jsonb('recommendations').$type<Recommendation[]>(),
    missingCards: jsonb('missing_cards').$type<MissingCard[]>(),
    suggestedArchetypeId: uuid('suggested_archetype_id').references(() => archetypes.id, {
      onDelete: 'set null',
    }),
    foundryRunId: text('foundry_run_id'),
    raw: jsonb('raw'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('deck_analyses_deck_idx').on(t.deckId)],
);

export const coachThreads = pgTable(
  'coach_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id').references(() => decks.id, { onDelete: 'set null' }),
    title: text('title'),
    foundryThreadId: text('foundry_thread_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('coach_threads_user_idx').on(t.userId)],
);

export const coachMessages = pgTable(
  'coach_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => coachThreads.id, { onDelete: 'cascade' }),
    role: coachRole('role').notNull(),
    content: text('content').notNull(),
    toolCalls: jsonb('tool_calls'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('coach_messages_thread_idx').on(t.threadId)],
);

// ─────────────────────────────────────────────────────────────
// Ops — card-sync bookkeeping
// ─────────────────────────────────────────────────────────────
export const cardSyncRuns = pgTable('card_sync_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: syncStatus('status').notNull().default('running'),
  cardsUpserted: integer('cards_upserted').notNull().default(0),
  setsUpserted: integer('sets_upserted').notNull().default(0),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  collectionItems: many(collectionItems),
  decks: many(decks),
  coachThreads: many(coachThreads),
}));

export const setsRelations = relations(sets, ({ many }) => ({ cards: many(cards) }));

export const cardsRelations = relations(cards, ({ one }) => ({
  set: one(sets, { fields: [cards.setId], references: [sets.id] }),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  user: one(users, { fields: [decks.userId], references: [users.id] }),
  archetype: one(archetypes, { fields: [decks.archetypeId], references: [archetypes.id] }),
  coverCard: one(cards, { fields: [decks.coverCardId], references: [cards.id] }),
  cards: many(deckCards),
  analyses: many(deckAnalyses),
}));

export const deckCardsRelations = relations(deckCards, ({ one }) => ({
  deck: one(decks, { fields: [deckCards.deckId], references: [decks.id] }),
  card: one(cards, { fields: [deckCards.cardId], references: [cards.id] }),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  user: one(users, { fields: [collectionItems.userId], references: [users.id] }),
  card: one(cards, { fields: [collectionItems.cardId], references: [cards.id] }),
}));

export const deckAnalysesRelations = relations(deckAnalyses, ({ one }) => ({
  deck: one(decks, { fields: [deckAnalyses.deckId], references: [decks.id] }),
  suggestedArchetype: one(archetypes, {
    fields: [deckAnalyses.suggestedArchetypeId],
    references: [archetypes.id],
  }),
}));

export const coachThreadsRelations = relations(coachThreads, ({ one, many }) => ({
  user: one(users, { fields: [coachThreads.userId], references: [users.id] }),
  deck: one(decks, { fields: [coachThreads.deckId], references: [decks.id] }),
  messages: many(coachMessages),
}));

export const coachMessagesRelations = relations(coachMessages, ({ one }) => ({
  thread: one(coachThreads, { fields: [coachMessages.threadId], references: [coachThreads.id] }),
}));

// ─────────────────────────────────────────────────────────────
// JSONB shape types (also re-exported from @pokedeck/shared)
// ─────────────────────────────────────────────────────────────
export interface Legalities {
  standard?: string;
  expanded?: string;
  unlimited?: string;
}
export interface Ability {
  name: string;
  text: string;
  type: string;
}
export interface Attack {
  name: string;
  cost?: string[];
  convertedEnergyCost?: number;
  damage?: string;
  text?: string;
}
export interface TypeMod {
  type: string;
  value: string;
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

// Convenient row-inference exports
export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type CardSet = typeof sets.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type DeckCard = typeof deckCards.$inferSelect;
export type Archetype = typeof archetypes.$inferSelect;
export type DeckAnalysis = typeof deckAnalyses.$inferSelect;
export type CoachThread = typeof coachThreads.$inferSelect;
export type CoachMessage = typeof coachMessages.$inferSelect;

void sql; // reserved for future raw defaults
