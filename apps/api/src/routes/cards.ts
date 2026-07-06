import type { FastifyInstance } from 'fastify';
import { and, arrayContains, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards } from '../db/schema.js';
import type { CardDTO, Paginated } from '@pokedeck/shared';

function toDTO(c: typeof cards.$inferSelect): CardDTO {
  return {
    id: c.id,
    setId: c.setId,
    name: c.name,
    supertype: c.supertype,
    subtypes: c.subtypes,
    types: c.types,
    hp: c.hp,
    rarity: c.rarity,
    regulationMark: c.regulationMark,
    smallImageUrl: c.smallImageUrl,
    largeImageUrl: c.largeImageUrl,
  };
}

export async function cardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/cards', async (req) => {
    const q = req.query as {
      query?: string;
      type?: string;
      supertype?: 'Pokémon' | 'Trainer' | 'Energy';
      page?: string;
      pageSize?: string;
    };
    const page = Math.max(1, Number.parseInt(q.page ?? '1', 10) || 1);
    const pageSize = Math.min(60, Math.max(1, Number.parseInt(q.pageSize ?? '30', 10) || 30));

    const conds = [];
    if (q.query) conds.push(ilike(cards.name, `%${q.query}%`));
    if (q.supertype) conds.push(eq(cards.supertype, q.supertype));
    if (q.type) conds.push(arrayContains(cards.types, [q.type]));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(cards)
        .where(where)
        .orderBy(cards.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(cards).where(where),
    ]);

    const result: Paginated<CardDTO> = {
      items: rows.map(toDTO),
      page,
      pageSize,
      total: countRows[0]?.count ?? 0,
    };
    return result;
  });

  app.get('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
    if (!row) return reply.code(404).send({ error: 'not_found', message: 'Card not found.' });
    return { ...toDTO(row), abilities: row.abilities, attacks: row.attacks };
  });
}
