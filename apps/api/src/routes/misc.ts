import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { archetypes } from '../db/schema.js';
import { getSessionFromRequest } from '../auth/plugin.js';
import { isFoundryConfigured } from '../services/foundry.js';

export async function miscRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({
    status: 'ok',
    foundry: isFoundryConfigured() ? 'configured' : 'offline',
    time: new Date().toISOString(),
  }));

  app.get('/api/me', async (req, reply) => {
    const session = await getSessionFromRequest(req);
    if (!session?.user?.id) return reply.code(401).send({ error: 'unauthorized', message: 'Not signed in.' });
    return { user: session.user };
  });

  app.get('/api/archetypes', async () => {
    const rows = await db.select().from(archetypes).orderBy(archetypes.name);
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      playstyle: a.playstyle,
      typicalTypes: a.typicalTypes,
    }));
  });
}
