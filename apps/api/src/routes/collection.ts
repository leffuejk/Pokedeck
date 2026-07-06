import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards, collectionItems } from '../db/schema.js';
import type { CollectionItemDTO, UpsertCollectionItemBody } from '@pokedeck/shared';

export async function collectionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/collection', async (req, reply) => {
    const user = await app.requireUser(req, reply);
    if (!user) return;
    const rows = await db
      .select()
      .from(collectionItems)
      .innerJoin(cards, eq(collectionItems.cardId, cards.id))
      .where(eq(collectionItems.userId, user.id))
      .orderBy(cards.name);

    return rows.map(
      (r): CollectionItemDTO => ({
        cardId: r.cards.id,
        quantity: r.collection_items.quantity,
        card: {
          id: r.cards.id,
          setId: r.cards.setId,
          name: r.cards.name,
          supertype: r.cards.supertype,
          subtypes: r.cards.subtypes,
          types: r.cards.types,
          hp: r.cards.hp,
          rarity: r.cards.rarity,
          regulationMark: r.cards.regulationMark,
          smallImageUrl: r.cards.smallImageUrl,
          largeImageUrl: r.cards.largeImageUrl,
        },
      }),
    );
  });

  app.put('/api/collection', async (req, reply) => {
    const user = await app.requireUser(req, reply);
    if (!user) return;
    const body = req.body as UpsertCollectionItemBody;
    if (!body?.cardId || typeof body.quantity !== 'number')
      return reply.code(400).send({ error: 'bad_request', message: 'cardId and quantity required.' });

    if (body.quantity <= 0) {
      await db
        .delete(collectionItems)
        .where(and(eq(collectionItems.userId, user.id), eq(collectionItems.cardId, body.cardId)));
      return reply.code(204).send();
    }

    const [row] = await db
      .insert(collectionItems)
      .values({ userId: user.id, cardId: body.cardId, quantity: body.quantity })
      .onConflictDoUpdate({
        target: [collectionItems.userId, collectionItems.cardId],
        set: { quantity: body.quantity },
      })
      .returning();
    return row;
  });

  app.delete('/api/collection/:cardId', async (req, reply) => {
    const user = await app.requireUser(req, reply);
    if (!user) return;
    const { cardId } = req.params as { cardId: string };
    await db
      .delete(collectionItems)
      .where(and(eq(collectionItems.userId, user.id), eq(collectionItems.cardId, cardId)));
    return reply.code(204).send();
  });
}
