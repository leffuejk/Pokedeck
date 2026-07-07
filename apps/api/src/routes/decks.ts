import type { FastifyInstance } from 'fastify';
import { requireUser } from '../auth/plugin.js';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards, collectionItems, deckAnalyses, deckCards, decks } from '../db/schema.js';
import type {
  CreateDeckBody,
  DeckCardDTO,
  DeckDetailDTO,
  DeckDTO,
  UpdateDeckCardBody,
} from '@pokedeck/shared';
import { analyzeDeck } from '../services/deck-coach.js';

async function loadDeckDetail(deckId: string): Promise<DeckDetailDTO | null> {
  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1);
  if (!deck) return null;
  const rows = await db
    .select()
    .from(deckCards)
    .innerJoin(cards, eq(deckCards.cardId, cards.id))
    .where(eq(deckCards.deckId, deckId));

  const cardDTOs: DeckCardDTO[] = rows.map((r) => ({
    cardId: r.cards.id,
    quantity: r.deck_cards.quantity,
    zone: r.deck_cards.zone,
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
  }));

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    format: deck.format,
    primaryTypes: deck.primaryTypes,
    coverCardId: deck.coverCardId,
    cardCount: cardDTOs.reduce((n, c) => n + c.quantity, 0),
    updatedAt: deck.updatedAt.toISOString(),
    cards: cardDTOs,
  };
}

export async function deckRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/decks', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const rows = await db.select().from(decks).where(eq(decks.userId, user.id)).orderBy(decks.updatedAt);
    return rows.map(
      (d): DeckDTO => ({
        id: d.id,
        name: d.name,
        description: d.description,
        format: d.format,
        primaryTypes: d.primaryTypes,
        coverCardId: d.coverCardId,
        cardCount: 0,
        updatedAt: d.updatedAt.toISOString(),
      }),
    );
  });

  app.post('/api/decks', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const body = req.body as CreateDeckBody;
    if (!body?.name) return reply.code(400).send({ error: 'bad_request', message: 'name required.' });
    const [deck] = await db
      .insert(decks)
      .values({ userId: user.id, name: body.name, format: body.format ?? 'standard', description: body.description })
      .returning();
    return loadDeckDetail(deck!.id);
  });

  app.get('/api/decks/:id', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const detail = await loadDeckDetail(id);
    if (!detail) return reply.code(404).send({ error: 'not_found', message: 'Deck not found.' });
    return detail;
  });

  app.put('/api/decks/:id/cards', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const body = req.body as UpdateDeckCardBody;
    const [owned] = await db
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.userId, user.id)))
      .limit(1);
    if (!owned) return reply.code(404).send({ error: 'not_found', message: 'Deck not found.' });

    const zone = body.zone ?? 'main';
    if (body.quantity <= 0) {
      await db
        .delete(deckCards)
        .where(and(eq(deckCards.deckId, id), eq(deckCards.cardId, body.cardId), eq(deckCards.zone, zone)));
    } else {
      await db
        .insert(deckCards)
        .values({ deckId: id, cardId: body.cardId, quantity: body.quantity, zone })
        .onConflictDoUpdate({
          target: [deckCards.deckId, deckCards.cardId, deckCards.zone],
          set: { quantity: body.quantity },
        });
    }
    await db.update(decks).set({ updatedAt: new Date() }).where(eq(decks.id, id));
    return loadDeckDetail(id);
  });

  app.delete('/api/decks/:id', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    await db.delete(decks).where(and(eq(decks.id, id), eq(decks.userId, user.id)));
    return reply.code(204).send();
  });

  // AI grading -----------------------------------------------------
  app.post('/api/decks/:id/analyze', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.userId, user.id)))
      .limit(1);
    if (!deck) return reply.code(404).send({ error: 'not_found', message: 'Deck not found.' });

    const rows = await db
      .select()
      .from(deckCards)
      .innerJoin(cards, eq(deckCards.cardId, cards.id))
      .where(eq(deckCards.deckId, id));
    const entries = rows.map((r) => ({ card: r.cards, quantity: r.deck_cards.quantity }));

    // Build card-name → owned-quantity map, aggregating across all printings.
    const collectionRows = await db
      .select({ name: cards.name, quantity: collectionItems.quantity })
      .from(collectionItems)
      .innerJoin(cards, eq(collectionItems.cardId, cards.id))
      .where(eq(collectionItems.userId, user.id));
    const ownedCards = new Map<string, number>();
    for (const row of collectionRows) {
      ownedCards.set(row.name, (ownedCards.get(row.name) ?? 0) + row.quantity);
    }

    const result = await analyzeDeck(entries, deck.name, ownedCards);
    const [saved] = await db
      .insert(deckAnalyses)
      .values({
        deckId: id,
        userId: user.id,
        model: result.model,
        overallScore: String(result.overallScore),
        scores: result.scores,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        missingCards: result.missingCards,
        foundryRunId: result.foundryRunId,
        raw: result.raw,
      })
      .returning();

    return {
      id: saved!.id,
      deckId: id,
      overallScore: result.overallScore,
      scores: result.scores,
      summary: result.summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      recommendations: result.recommendations,
      missingCards: result.missingCards,
      suggestedArchetypeId: null,
      createdAt: saved!.createdAt.toISOString(),
    };
  });

  app.get('/api/decks/:id/analyses', async (req, reply) => {
    const user = await requireUser(req, reply);
    if (!user) return;
    const { id } = req.params as { id: string };
    const rows = await db
      .select()
      .from(deckAnalyses)
      .where(and(eq(deckAnalyses.deckId, id), eq(deckAnalyses.userId, user.id)))
      .orderBy(deckAnalyses.createdAt);
    return rows.map((a) => ({
      id: a.id,
      deckId: a.deckId,
      overallScore: a.overallScore ? Number(a.overallScore) : null,
      scores: a.scores,
      summary: a.summary,
      strengths: a.strengths,
      weaknesses: a.weaknesses,
      recommendations: a.recommendations,
      missingCards: a.missingCards,
      suggestedArchetypeId: a.suggestedArchetypeId,
      createdAt: a.createdAt.toISOString(),
    }));
  });
}
