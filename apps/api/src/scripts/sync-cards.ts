import { pool } from '../db/client.js';
import { syncCards } from '../services/card-sync.js';

/** CLI: `npm run cards:sync` — pull all sets + cards from pokemontcg.io into Postgres. */
syncCards()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
