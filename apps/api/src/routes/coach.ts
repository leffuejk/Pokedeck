import type { FastifyInstance } from 'fastify';
import { requireUser } from '../auth/plugin.js';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards, coachMessages, coachThreads, deckCards, decks } from '../db/schema.js';
import type { CoachMessageBody } from '@pokedeck/shared';
import { coachReply } from '../services/deck-coach.js';

export async function coachRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/coach', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = req.body as CoachMessageBody;
    if (!body?.message) return reply.code(400).send({ error: 'bad_request', message: 'message required.' });

    // Resolve or create a thread.
    let threadId = body.threadId;
    if (threadId) {
      const [t] = await db
        .select({ id: coachThreads.id })
        .from(coachThreads)
        .where(and(eq(coachThreads.id, threadId), eq(coachThreads.userId, user.id)))
        .limit(1);
      if (!t) threadId = undefined;
    }
    if (!threadId) {
      const [t] = await db
        .insert(coachThreads)
        .values({ userId: user.id, deckId: body.deckId, title: body.message.slice(0, 60) })
        .returning();
      threadId = t!.id;
    }

    // Build optional deck context.
    let deckContext: string | undefined;
    if (body.deckId) {
      const rows = await db
        .select({ name: cards.name, supertype: cards.supertype, qty: deckCards.quantity })
        .from(deckCards)
        .innerJoin(cards, eq(deckCards.cardId, cards.id))
        .where(eq(deckCards.deckId, body.deckId));
      const [deck] = await db.select().from(decks).where(eq(decks.id, body.deckId)).limit(1);
      if (deck) deckContext = `Deck "${deck.name}":\n${rows.map((r) => `${r.qty}x ${r.name}`).join('\n')}`;
    }

    await db.insert(coachMessages).values({ threadId, role: 'user', content: body.message });
    const reply2 = await coachReply(body.message, deckContext);
    await db.insert(coachMessages).values({ threadId, role: 'assistant', content: reply2 });
    await db.update(coachThreads).set({ updatedAt: new Date() }).where(eq(coachThreads.id, threadId));

    return { threadId, reply: reply2 };
  });

  app.get('/api/coach/:threadId', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { threadId } = req.params as { threadId: string };
    const [t] = await db
      .select()
      .from(coachThreads)
      .where(and(eq(coachThreads.id, threadId), eq(coachThreads.userId, user.id)))
      .limit(1);
    if (!t) return reply.code(404).send({ error: 'not_found', message: 'Thread not found.' });
    const messages = await db
      .select()
      .from(coachMessages)
      .where(eq(coachMessages.threadId, threadId))
      .orderBy(asc(coachMessages.createdAt));
    return { thread: t, messages };
  });
}
