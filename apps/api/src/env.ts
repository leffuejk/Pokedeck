import { z } from 'zod';

/** Validated, typed environment. Fails fast at boot if misconfigured. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  AUTH_SECRET: z.string().min(1),
  AUTH_TRUST_HOST: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  POKEMONTCG_API_KEY: z.string().optional(),

  AZURE_AI_FOUNDRY_PROJECT_ENDPOINT: z.string().optional(),
  AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT: z.string().default('gpt-5-mini'),
  AZURE_AI_FOUNDRY_AGENT_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = typeof env;
