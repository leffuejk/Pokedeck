# Pokedeck — Agent Instructions

## Stack & layout
npm-workspaces monorepo:
- `apps/web` — React frontend (Vite, TypeScript)
- `apps/api` — API backend (TypeScript)
- `packages/shared` — shared code
Azure-hosted. Card data: pokemontcg.io API (card IDs are the canonical join key).

## Commands
- Test: `npm test` (root, runs all workspaces) or `npm run test --workspace apps/web`
- Typecheck: `tsc --noEmit` per workspace
- Build: `npm run build --workspace <ws>`
Always run tests + typecheck before committing. Never commit failing code.

## Required reading
- **VISION.md** — before proposing or judging any feature/product decision
- **DOMAIN.md** — before touching deck logic, card data, analysis, or recommendations.
  Deck-construction rules in it are hard constraints; violating them is a bug.

## Conventions
- Commit format: `POKE-N: summary`
- Reuse existing components/patterns before writing new ones (check how modals,
  card tiles, and filters are already done)
- Match on pokemontcg.io card IDs, never fuzzy name matching
- Unknown supertypes bucket into "Other", never dropped
- Tests must not call live LLMs or external APIs — mock them
- No new dependencies unless the ticket explicitly allows it