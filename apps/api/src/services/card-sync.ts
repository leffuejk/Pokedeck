import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards, sets, cardSyncRuns } from '../db/schema.js';
import type { CardSupertype } from '@pokedeck/shared';
import { fetchAllSets, iterateCards, type PtcgCard, type PtcgSet } from './pokemontcg.js';

const SUPERTYPES: Record<string, CardSupertype> = {
  Pokémon: 'Pokémon',
  Pokemon: 'Pokémon',
  Trainer: 'Trainer',
  Energy: 'Energy',
};

function mapSet(s: PtcgSet) {
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

function mapCard(c: PtcgCard) {
  return {
    id: c.id,
    setId: c.set.id,
    name: c.name,
    supertype: SUPERTYPES[c.supertype] ?? 'Trainer',
    subtypes: c.subtypes ?? null,
    types: c.types ?? null,
    hp: c.hp ? Number.parseInt(c.hp, 10) || null : null,
    number: c.number ?? null,
    rarity: c.rarity ?? null,
    regulationMark: c.regulationMark ?? null,
    nationalPokedexNumbers: c.nationalPokedexNumbers ?? null,
    evolvesFrom: c.evolvesFrom ?? null,
    evolvesTo: c.evolvesTo ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abilities: (c.abilities as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attacks: (c.attacks as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weaknesses: (c.weaknesses as any) ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resistances: (c.resistances as any) ?? null,
    retreatCost: c.retreatCost ?? null,
    convertedRetreatCost: c.convertedRetreatCost ?? null,
    flavorText: c.flavorText ?? null,
    artist: c.artist ?? null,
    smallImageUrl: c.images?.small ?? null,
    largeImageUrl: c.images?.large ?? null,
    legalities: c.legalities ?? null,
    raw: c as unknown,
    updatedAt: new Date(),
  };
}

/**
 * Full upsert sync of sets + cards from the Pokémon TCG API into Postgres.
 * Idempotent — safe to re-run; existing rows are updated on conflict.
 */
export async function syncCards(log: (m: string) => void = console.log): Promise<void> {
  const [run] = await db.insert(cardSyncRuns).values({}).returning();
  const runId = run!.id;
  let setsUpserted = 0;
  let cardsUpserted = 0;
  try {
    log('Fetching sets…');
    const allSets = await fetchAllSets();
    for (const chunk of chunked(allSets.map(mapSet), 100)) {
      await db
        .insert(sets)
        .values(chunk)
        .onConflictDoUpdate({
          target: sets.id,
          set: conflictSet(sets, ['name', 'series', 'printedTotal', 'total', 'ptcgoCode', 'releaseDate', 'symbolImageUrl', 'logoImageUrl', 'legalities', 'updatedAt']),
        });
      setsUpserted += chunk.length;
    }
    log(`Upserted ${setsUpserted} sets. Fetching cards…`);

    for await (const page of iterateCards()) {
      const rows = page.map(mapCard);
      for (const chunk of chunked(rows, 100)) {
        await db
          .insert(cards)
          .values(chunk)
          .onConflictDoUpdate({
            target: cards.id,
            set: conflictSet(cards, ['setId', 'name', 'supertype', 'subtypes', 'types', 'hp', 'number', 'rarity', 'regulationMark', 'nationalPokedexNumbers', 'evolvesFrom', 'evolvesTo', 'abilities', 'attacks', 'weaknesses', 'resistances', 'retreatCost', 'convertedRetreatCost', 'flavorText', 'artist', 'smallImageUrl', 'largeImageUrl', 'legalities', 'raw', 'updatedAt']),
          });
        cardsUpserted += chunk.length;
      }
      if (cardsUpserted % 1000 < 100) log(`…${cardsUpserted} cards`);
    }

    await db
      .update(cardSyncRuns)
      .set({ status: 'succeeded', setsUpserted, cardsUpserted, finishedAt: new Date() })
      .where(eqRun(runId));
    log(`✅ Sync complete: ${setsUpserted} sets, ${cardsUpserted} cards.`);
  } catch (err) {
    await db
      .update(cardSyncRuns)
      .set({
        status: 'failed',
        setsUpserted,
        cardsUpserted,
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      })
      .where(eqRun(runId));
    throw err;
  }
}

// helpers ----------------------------------------------------------
function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function conflictSet(table: any, cols: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cols) out[c] = sql`excluded.${sql.identifier(toSnake(c))}`;
  return out;
}
function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}
function eqRun(id: string) {
  return sql`${cardSyncRuns.id} = ${id}`;
}
