import type { AuthConfig } from '@auth/core';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import MicrosoftEntraId from '@auth/core/providers/microsoft-entra-id';
import Google from '@auth/core/providers/google';
import type { Provider } from '@auth/core/providers';
import { db } from '../db/client.js';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  authenticators,
} from '../db/schema.js';
import { env } from '../env.js';

/** Only enable a provider if its client credentials are present. */
function providers(): Provider[] {
  const list: Provider[] = [];
  if (env.AUTH_MICROSOFT_ENTRA_ID_ID && env.AUTH_MICROSOFT_ENTRA_ID_SECRET) {
    list.push(
      MicrosoftEntraId({
        clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      }),
    );
  }
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    list.push(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }));
  }
  return list;
}

export const authConfig: AuthConfig = {
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST,
  basePath: '/api/auth',
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: { strategy: 'database' },
  providers: providers(),
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};
