import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

/** Apply pending SQL migrations from ./drizzle. Run in CD before deploying new app image. */
async function main() {
  console.log('Running database migrations…');
  await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
  console.log('✅ Migrations complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
