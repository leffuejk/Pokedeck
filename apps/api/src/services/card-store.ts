/**
 * Postgres-backed CardStore for the sync (Drizzle). Kept separate from the
 * orchestrator so `card-sync.ts` imports no DB/env and stays unit-testable.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards, sets, cardSyncRuns } from '../db/schema.js';
import type { CardStore } from './card-sync.js';
import type { MappedCard, MappedSet } from './card-mapping.js';

const SET_COLS = [
  'name',
  'series',
  'printedTotal',
  'total',
  'ptcgoCode',
  'releaseDate',
  'symbolImageUrl',
  'logoImageUrl',
  'legalities',
  'updatedAt',
];

const CARD_COLS = [
  'setId',
  'name',
  'supertype',
  'subtypes',
  'types',
  'hp',
  'number',
  'rarity',
  'regulationMark',
  'nationalPokedexNumbers',
  'evolvesFrom',
  'evolvesTo',
  'abilities',
  'attacks',
  'weaknesses',
  'resistances',
  'retreatCost',
  'convertedRetreatCost',
  'flavorText',
  'artist',
  'smallImageUrl',
  'largeImageUrl',
  'legalities',
  'legalityStandard',
  'legalityExpanded',
  'raw',
  'sourceHash',
  'updatedAt',
];

function excludedSet(cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) out[c] = sql`excluded.${sql.identifier(toSnake(c))}`;
  return out;
}
function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function createDbStore(): CardStore {
  return {
    async loadCardHashes() {
      const rows = await db.select({ id: cards.id, hash: cards.sourceHash }).from(cards);
      return new Map(rows.map((r) => [r.id, r.hash]));
    },

    async upsertSets(rows: MappedSet[]) {
      if (rows.length === 0) return;
      await db
        .insert(sets)
        .values(rows)
        .onConflictDoUpdate({ target: sets.id, set: excludedSet(SET_COLS) });
    },

    async upsertCards(rows: MappedCard[]) {
      if (rows.length === 0) return;
      await db
        .insert(cards)
        .values(rows)
        .onConflictDoUpdate({ target: cards.id, set: excludedSet(CARD_COLS) });
    },

    async startRun() {
      const [run] = await db.insert(cardSyncRuns).values({}).returning();
      return run!.id;
    },

    async finishRun(runId, result) {
      await db
        .update(cardSyncRuns)
        .set({
          status: result.status,
          setsUpserted: result.sets,
          cardsUpserted: result.cards,
          error: result.error,
          finishedAt: new Date(),
        })
        .where(sql`${cardSyncRuns.id} = ${runId}`);
    },
  };
}
