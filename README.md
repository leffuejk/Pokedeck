<div align="center">

# 🃏 Pokedeck

**Pick the cards you own. Let the AI Professor grade your deck, suggest strategies, and spot what you're missing.**

Full-stack TypeScript · Azure · Postgres · Azure AI Foundry

</div>

---

## What it does

Pokedeck helps a Pokémon TCG player turn a pile of cards into a winning deck:

- **Track your collection** — search the full card database and mark what you own.
- **Build decks** — drag your owned cards into 60-card decks with live format validation.
- **Grade with AI** — the "Professor" agent scores your deck across six axes (consistency, energy balance, type coverage, speed, resilience, tech flexibility) and explains why.
- **Get recommendations** — cards you *already own* that belong in the deck, plus staples you're *missing* for a chosen strategy.
- **Talk strategy** — a conversational deck coach powered by Azure AI Foundry.

## Architecture

```
apps/web      React + Vite + Tailwind SPA        → Azure Static Web Apps
apps/api      Fastify + Drizzle + Auth.js API    → Azure Container Apps
packages/shared   Shared TS types (API contract)
infra         Bicep (all Azure resources)        → region: Central US
.github       GitHub Actions CI/CD (OIDC)
```

| Concern | Choice |
|---------|--------|
| Language | TypeScript end-to-end (Node 22) |
| Data | Azure Database for PostgreSQL Flexible Server + [Drizzle ORM](https://orm.drizzle.team) |
| Auth | Self-hosted [Auth.js](https://authjs.dev) with SSO (Microsoft Entra / Google / GitHub) |
| AI | [Azure AI Foundry](https://ai.azure.com) agent + deterministic heuristic fallback |
| Card data | [pokemontcg.io](https://pokemontcg.io) API, cached in Postgres |
| Hosting | Container Apps (API) + Static Web Apps (web) |
| CI/CD | GitHub Actions, passwordless via OIDC federated credentials |
| Issues | [xpntl.dev](https://xpntl.dev) |

See [docs/architecture.md](docs/architecture.md), [docs/data-model.md](docs/data-model.md), and [docs/alm.md](docs/alm.md).

## Quickstart (local)

```bash
# 1. Install
npm install

# 2. Postgres (docker) + env
docker run -d --name pokedeck-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pokedeck -p 5432:5432 postgres:16
cp .env.example .env            # then fill AUTH_SECRET etc.

# 3. Schema + data
npm run db:generate             # generate SQL migration from schema
npm run db:migrate              # apply it
npm run seed:archetypes --workspace apps/api
npm run cards:sync --workspace apps/api   # pull the card DB (optional, large)

# 4. Run
npm run dev                     # api :3000  +  web :5173
```

The app runs fully offline without Azure — Foundry calls fall back to a deterministic
heuristic analyzer, so you can build and grade decks with no cloud dependencies.

## Deploy

Infrastructure and app deploys are automated via GitHub Actions. To bring up a fresh
environment, follow [docs/alm.md](docs/alm.md): bootstrap the OIDC app registration, set the
documented repo variables/secrets, then let `infra-cd` and `app-cd` deploy to Azure.

## Repo scripts

| Command | Does |
|---------|------|
| `npm run dev` | Run API + web locally |
| `npm run build` | Build all workspaces |
| `npm run lint` / `npm run typecheck` | Quality gates (also run in CI) |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |
| `npm run cards:sync` | Sync card data from pokemontcg.io |
