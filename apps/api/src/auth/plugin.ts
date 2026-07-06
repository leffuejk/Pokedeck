import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Auth, createActionURL } from '@auth/core';
import type { Session } from '@auth/core/types';
import { authConfig } from './config.js';
import { env } from '../env.js';

/**
 * Bridges Fastify <-> the Web Fetch API that @auth/core speaks, and mounts
 * Auth.js on /api/auth/*. Also decorates the request with `getSession()`.
 */
function toWebRequest(req: FastifyRequest): Request {
  const url = new URL(req.url, env.API_ORIGIN);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value != null) headers.set(key, value);
  }
  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(url, {
    method,
    headers,
    body: hasBody && req.body != null ? JSON.stringify(req.body) : undefined,
  });
}

async function sendWebResponse(res: FastifyReply, response: Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') res.header('set-cookie', value);
    else res.header(key, value);
  });
  const body = await response.text();
  res.send(body);
}

/** Fetch the current session for a request (via the Auth.js /session endpoint). */
export async function getSessionFromRequest(req: FastifyRequest): Promise<Session | null> {
  const url = createActionURL(
    'session',
    'http',
    new Headers(req.headers as Record<string, string>),
    process.env,
    authConfig,
  );
  const response = await Auth(
    new Request(url, { headers: { cookie: req.headers.cookie ?? '' } }),
    authConfig,
  );
  const data = (await response.json()) as Session | Record<string, never>;
  if (!data || Object.keys(data).length === 0) return null;
  return data as Session;
}

export async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest('session', null);

  app.all('/api/auth/*', async (req, reply) => {
    const response = await Auth(toWebRequest(req), authConfig);
    await sendWebResponse(reply, response);
  });

  app.decorate(
    'requireUser',
    async (req: FastifyRequest, reply: FastifyReply): Promise<{ id: string } | undefined> => {
      const session = await getSessionFromRequest(req);
      if (!session?.user?.id) {
        reply.code(401).send({ error: 'unauthorized', message: 'Sign in required.' });
        return undefined;
      }
      req.session = session;
      return { id: session.user.id };
    },
  );
}

declare module 'fastify' {
  interface FastifyRequest {
    session: Session | null;
  }
  interface FastifyInstance {
    requireUser(req: FastifyRequest, reply: FastifyReply): Promise<{ id: string } | undefined>;
  }
}

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
