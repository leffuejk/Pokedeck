# ── Build stage ────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /repo

# Install deps using the workspace root (better layer caching).
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

# Copy sources and build the api (+ its workspace deps).
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @pokedeck/api

# Prune to production deps for the runtime image.
RUN npm prune --omit=dev

# ── Runtime stage ──────────────────────────────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared ./packages/shared
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/drizzle ./apps/api/drizzle
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
