import { z } from 'zod';

/**
 * Validated, typed environment. Fails fast at boot if misconfigured.
 *
 * The database can be configured two ways, and both are supported so the same
 * image runs locally and in Azure:
 *   1. A single `DATABASE_URL` (local dev, and the migration job in CI).
 *   2. Discrete `DATABASE_HOST/PORT/USER/PASSWORD/NAME` (Azure Container Apps,
 *      where the password arrives as a Key Vault secret reference and is never
 *      composed into a plaintext URL).
 * Similarly, the Foundry endpoint is read from either the `AZURE_AI_FOUNDRY_*`
 * names (local `.env`) or the shorter `FOUNDRY_*` names the Bicep sets.
 */
const boolish = (def: 'true' | 'false') =>
  z
    .string()
    .default(def)
    .transform((v) => ['true', 'require', 'verify-full', '1', 'yes'].includes(v.toLowerCase()));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:3000'),

  // Option 1: full URL. Option 2: discrete parts.
  DATABASE_URL: z.string().optional(),
  DATABASE_HOST: z.string().optional(),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().optional(),
  DATABASE_PASSWORD: z.string().optional(),
  DATABASE_NAME: z.string().default('pokedeck'),
  DATABASE_SSL: boolish('false'),

  AUTH_SECRET: z.string().min(1),
  AUTH_TRUST_HOST: boolish('true'),

  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  POKEMONTCG_API_KEY: z.string().optional(),

  // Accept both the local (.env) and Bicep-set names.
  AZURE_AI_FOUNDRY_PROJECT_ENDPOINT: z.string().optional(),
  FOUNDRY_PROJECT_ENDPOINT: z.string().optional(),
  AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT: z.string().optional(),
  FOUNDRY_MODEL_DEPLOYMENT: z.string().optional(),
  AZURE_AI_FOUNDRY_AGENT_ID: z.string().optional(),
});

// Treat empty-string env vars as unset so schema defaults apply. (Azure Container
// Apps materializes unset template values as "", which would otherwise fail
// validators like WEB_ORIGIN's `.url()` and crash the process at boot.)
const cleanedEnv = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
);

const parsed = schema.safeParse(cleanedEnv);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const raw = parsed.data;

if (!raw.DATABASE_URL && !(raw.DATABASE_HOST && raw.DATABASE_USER && raw.DATABASE_PASSWORD)) {
  throw new Error(
    'Database not configured: set DATABASE_URL, or DATABASE_HOST + DATABASE_USER + DATABASE_PASSWORD.',
  );
}

/** Normalized, resolved config the rest of the app consumes. */
export const env = {
  ...raw,
  foundryProjectEndpoint: raw.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT ?? raw.FOUNDRY_PROJECT_ENDPOINT,
  foundryModelDeployment:
    raw.AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT ?? raw.FOUNDRY_MODEL_DEPLOYMENT ?? 'gpt-5-mini',
};

export type Env = typeof env;

/** Build the pg Pool config from whichever database style was provided. */
export function databasePoolConfig(): {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  const ssl = env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined;
  if (env.DATABASE_URL) return { connectionString: env.DATABASE_URL, ssl };
  return {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl,
  };
}
