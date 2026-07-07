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
  // Auth.js bodies are raw (form-urlencoded for signin/callback). The auth-scoped
  // content-type parser keeps req.body as the verbatim string, so pass it through
  // untouched and preserve the original Content-Type header.
  const body =
    hasBody && req.body != null
      ? typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body)
      : undefined;
  return new Request(url, { method, headers, body });
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
  // Auth.js needs the raw request body (signin/callback are form-urlencoded, which
  // Fastify otherwise rejects with 415). Capture bodies verbatim as a string. This
  // parser is scoped to the auth plugin's encapsulation context, so the JSON API
  // routes registered elsewhere keep their normal JSON parsing.
  app.addContentTypeParser(
    ['application/x-www-form-urlencoded', 'application/json'],
    { parseAs: 'string' },
    (_req, body, done) => done(null, body),
  );

  app.all('/api/auth/*', async (req, reply) => {
    const response = await Auth(toWebRequest(req), authConfig);
    await sendWebResponse(reply, response);
  });
}

/**
 * Guard for authenticated routes. Returns the user id, or sends a 401 and returns
 * undefined. Exported as a plain function (not a Fastify decorator) so it works
 * from any route module regardless of plugin encapsulation.
 */
export async function requireUser(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<{ id: string } | undefined> {
  const session = await getSessionFromRequest(req);
  if (!session?.user?.id) {
    reply.code(401).send({ error: 'unauthorized', message: 'Sign in required.' });
    return undefined;
  }
  return { id: session.user.id };
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
