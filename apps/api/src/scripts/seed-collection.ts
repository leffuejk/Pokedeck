import { pool } from '../db/client.js';

/**
 * Seed a realistic demo collection for a user (defaults to the first/only user).
 * Simulates ~4 years of collecting from 2020-onward sets: a natural rarity pyramid
 * (many commons/uncommons, fewer rares, a handful of chase cards), a trainer
 * backbone, and a big pile of energy. Idempotent — clears the user's collection
 * first. Usage: `npm run seed:collection --workspace apps/api`
 */
const SINCE = '2020/01/01';
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

interface Bucket {
  label: string;
  where: string;
  distinct: number;
  qtyMin: number;
  qtyMax: number;
}

// set filter: only cards from sets released since 2020
const S = `c.set_id IN (SELECT id FROM sets WHERE release_date >= '${SINCE}')`;

const BUCKETS: Bucket[] = [
  // Pokémon — rarity pyramid
  { label: 'Pokémon common/uncommon', where: `c.supertype='Pokémon' AND c.rarity IN ('Common','Uncommon')`, distinct: 80, qtyMin: 2, qtyMax: 4 },
  { label: 'Pokémon rare', where: `c.supertype='Pokémon' AND c.rarity IN ('Rare','Rare Holo','Double Rare')`, distinct: 40, qtyMin: 1, qtyMax: 2 },
  { label: 'Pokémon chase (ex/V/illustration)', where: `c.supertype='Pokémon' AND c.rarity IS NOT NULL AND c.rarity NOT IN ('Common','Uncommon','Rare','Rare Holo','Double Rare')`, distinct: 25, qtyMin: 1, qtyMax: 1 },
  // Trainers — staples backbone
  { label: 'Trainer common/uncommon', where: `c.supertype='Trainer' AND c.rarity IN ('Common','Uncommon')`, distinct: 55, qtyMin: 2, qtyMax: 4 },
  { label: 'Trainer rare+', where: `c.supertype='Trainer' AND c.rarity IS NOT NULL AND c.rarity NOT IN ('Common','Uncommon')`, distinct: 12, qtyMin: 1, qtyMax: 2 },
  // Energy — basics in bulk + some special
  { label: 'Basic energy', where: `c.supertype='Energy' AND c.subtypes @> ARRAY['Basic']::text[]`, distinct: 8, qtyMin: 10, qtyMax: 18 },
  { label: 'Special energy', where: `c.supertype='Energy' AND (c.subtypes IS NULL OR NOT (c.subtypes @> ARRAY['Basic']::text[]))`, distinct: 12, qtyMin: 2, qtyMax: 4 },
];

async function seedForUser(user: { id: string; email: string }) {
  console.log(`\nSeeding collection for ${user.email} (${user.id})`);

  await pool.query(`DELETE FROM collection_items WHERE user_id = $1`, [user.id]);

  const rows: Array<{ cardId: string; qty: number }> = [];
  const seen = new Set<string>();

  for (const b of BUCKETS) {
    const res = await pool.query<{ id: string }>(
      `SELECT c.id FROM cards c WHERE ${b.where} AND ${S} ORDER BY random() LIMIT ${b.distinct}`,
    );
    let added = 0;
    for (const r of res.rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      rows.push({ cardId: r.id, qty: rnd(b.qtyMin, b.qtyMax) });
      added++;
    }
    console.log(`  ${b.label}: ${added} distinct`);
  }

  // Bulk insert in chunks.
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const values: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((row, j) => {
      params.push(user.id, row.cardId, row.qty);
      values.push(`($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`);
    });
    await pool.query(
      `INSERT INTO collection_items (user_id, card_id, quantity) VALUES ${values.join(',')}
       ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      params,
    );
  }

  const totals = await pool.query<{ supertype: string; distinct: string; total: string }>(
    `SELECT c.supertype, COUNT(*) AS distinct, SUM(ci.quantity) AS total
       FROM collection_items ci JOIN cards c ON c.id = ci.card_id
      WHERE ci.user_id = $1 GROUP BY c.supertype ORDER BY total DESC`,
    [user.id],
  );
  console.log('\n=== Seeded collection ===');
  let grand = 0;
  for (const t of totals.rows) {
    console.log(`  ${t.supertype.padEnd(10)} ${t.distinct} distinct, ${t.total} total`);
    grand += Number(t.total);
  }
  console.log(`  ${'TOTAL'.padEnd(10)} ${rows.length} distinct, ${grand} cards`);
}

async function main() {
  const users = await pool.query<{ id: string; email: string; created_at: string }>(
    `SELECT u.id, u.email, u.created_at,
            (SELECT string_agg(a.provider, ',') FROM accounts a WHERE a.user_id = u.id) AS providers
       FROM users u ORDER BY u.created_at ASC`,
  );
  console.log(`=== Users in DB (${users.rows.length}) ===`);
  for (const u of users.rows as Array<{ id: string; email: string; created_at: string; providers?: string }>) {
    console.log(`  ${u.id} | ${u.email} | providers=${u.providers ?? 'none'} | ${u.created_at}`);
  }
  if (users.rows.length === 0) throw new Error('No users found — sign in first.');

  // Seed every user so whichever account is signed in has a collection.
  for (const u of users.rows) await seedForUser({ id: u.id, email: u.email });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
