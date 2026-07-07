import type { FastifyInstance } from 'fastify';
import { and, arrayContains, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards } from '../db/schema.js';
import type { CardDTO, Paginated } from '@pokedeck/shared';
import { getCardById, type CardLookup } from '../services/card-repository.js';
import { cacheCard } from '../services/card-store.js';
import { fetchCardById } from '../services/pokemontcg.js';
import { toDTO, toCardDetailDTO } from './card-dto.js';

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

  // Local-first single-card lookup: read our table, fall back to the live API on
  // a cache miss (logged), and cache the result so the next read is local.
  const lookup: CardLookup = {
    findLocal: async (id) => (await db.select().from(cards).where(eq(cards.id, id)).limit(1))[0] ?? null,
    fetchRemote: async (id) => {
      const apiCard = await fetchCardById(id);
      return apiCard ? { card: apiCard, setId: apiCard.set.id } : null;
    },
    cacheCard,
    onFallback: (id) =>
      app.log.warn({ cardId: id }, 'card cache miss — falling back to live pokemontcg.io API'),
  };

  app.get('/api/cards/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await getCardById(id, lookup);
    if (!row) return reply.code(404).send({ error: 'not_found', message: 'Card not found.' });
    return toCardDetailDTO(row);
  });
}
