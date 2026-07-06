import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { env } from './env.js';
import { authPlugin } from './auth/plugin.js';
import { miscRoutes } from './routes/misc.js';
import { cardRoutes } from './routes/cards.js';
import { collectionRoutes } from './routes/collection.js';
import { deckRoutes } from './routes/decks.js';
import { coachRoutes } from './routes/coach.js';

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
  });

  await app.register(sensible);
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(authPlugin);
  await app.register(miscRoutes);
  await app.register(cardRoutes);
  await app.register(collectionRoutes);
  await app.register(deckRoutes);
  await app.register(coachRoutes);

  app.get('/', async () => ({ name: 'pokedeck-api', ok: true }));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🃏 Pokedeck API listening on ${env.API_ORIGIN}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
