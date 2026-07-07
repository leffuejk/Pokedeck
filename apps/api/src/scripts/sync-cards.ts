import { pool } from '../db/client.js';
import { syncCards } from '../services/card-sync.js';
import { createDbStore } from '../services/card-store.js';
import { repoCardSource } from '../services/pokemon-tcg-data.js';

/**
 * CLI: `npm run cards:sync` — sync all sets + cards from the pokemon-tcg-data
 * repo into Postgres. Idempotent; safe to rerun. Prints an insert/update/
 * unchanged summary.
 */
syncCards(repoCardSource, createDbStore())
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
