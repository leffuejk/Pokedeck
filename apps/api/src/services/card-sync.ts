/**
 * Card sync orchestrator. Pulls sets + cards from a CardSource and upserts them
 * into a CardStore, classifying each card as inserted / updated / unchanged via
 * its source hash. Idempotent: a rerun with unchanged source data writes nothing
 * and reports everything as "unchanged".
 *
 * This module imports no DB/env/network directly — the concrete source and store
 * are injected — so it (and the mapping) are unit-testable without a database.
 */
import { classifyCard, mapCard, mapSet, type MappedCard, type MappedSet } from './card-mapping.js';
import type { CardSource } from './pokemon-tcg-data.js';

export interface CardStore {
  /** id -> source_hash for every existing card (null hash = present but never hashed). */
  loadCardHashes(): Promise<Map<string, string | null>>;
  upsertSets(rows: MappedSet[]): Promise<void>;
  upsertCards(rows: MappedCard[]): Promise<void>;
  startRun(): Promise<string>;
  finishRun(
    runId: string,
    result: { status: 'succeeded' | 'failed'; sets: number; cards: number; error?: string },
  ): Promise<void>;
}

export interface SyncSummary {
  sets: number;
  inserted: number;
  updated: number;
  unchanged: number;
  durationMs: number;
}

function* chunked<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

export async function syncCards(
  source: CardSource,
  store: CardStore,
  log: (m: string) => void = console.log,
): Promise<SyncSummary> {
  const startedAt = Date.now();
  const runId = await store.startRun();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  try {
    log('Fetching sets…');
    const sourceSets = await source.fetchAllSets();
    await store.upsertSets(sourceSets.map(mapSet));
    log(`Upserted ${sourceSets.length} sets. Syncing cards…`);

    const existing = await store.loadCardHashes();

    // Per-set processing bounds memory and keeps partial failure safe: a crash
    // mid-run leaves earlier sets fully synced; rerunning resumes idempotently.
    for (const s of sourceSets) {
      const srcCards = await source.fetchCardsForSet(s.id);
      const toWrite: MappedCard[] = [];
      for (const c of srcCards) {
        const mapped = mapCard(c, s.id);
        const verdict = classifyCard(existing, mapped);
        if (verdict === 'unchanged') {
          unchanged++;
          continue;
        }
        if (verdict === 'insert') inserted++;
        else updated++;
        toWrite.push(mapped);
        existing.set(mapped.id, mapped.sourceHash); // keep map current within the run
      }
      for (const chunk of chunked(toWrite, 200)) await store.upsertCards(chunk);
    }

    await store.finishRun(runId, {
      status: 'succeeded',
      sets: sourceSets.length,
      cards: inserted + updated,
    });

    const summary: SyncSummary = {
      sets: sourceSets.length,
      inserted,
      updated,
      unchanged,
      durationMs: Date.now() - startedAt,
    };
    log(
      `✅ Sync complete: ${summary.sets} sets · ${inserted} inserted · ${updated} updated · ` +
        `${unchanged} unchanged · ${summary.durationMs}ms`,
    );
    return summary;
  } catch (err) {
    await store.finishRun(runId, {
      status: 'failed',
      sets: 0,
      cards: inserted + updated,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
