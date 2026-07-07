# Pokedeck — Product Vision

> This document is the lens for all product and architecture decisions. Agents proposing
> tickets, implementing features, or reviewing work should evaluate ideas against this
> vision. If a proposal doesn't serve something in here, it needs to justify itself.

## What Pokedeck is

Pokedeck is a **collection-aware deck helper for the Pokémon Trading Card Game** (the
physical card game — *not* Pokémon TCG Pocket, which is a different game with different
rules). It answers one question better than anything else: **"What's the best deck I can
build with the cards I actually own?"**

Most deck-building content online assumes you can acquire any card. Pokedeck starts from
the opposite premise: your collection is the constraint, and great advice respects it.

## Who it's for

- **The returning/casual player**: owns a shoebox of cards, wants to build something
  playable for league night or kitchen-table games without buying a netdeck.
- **The improving player**: has decks, wants them to get better, and wants to understand
  *why* a change helps — not just be handed a list.
- **The collector-builder**: tracks what they own and enjoys discovering that they're
  three cards away from a real archetype.

Not the target: professional/competitive grinders who already live on tournament data
sites. If they find it useful, great, but we don't optimize for them.

## Product pillars

1. **Collection** — the source of truth. Tracking what you own (and how many) must be
   easy, accurate, and fast. Every other feature builds on this data.
2. **Deck Builder** — building and editing decks from your collection, with the deck as
   the primary object (see POKE-6's deck-first layout principle).
3. **Deck Doctor** — AI analysis that is *always actionable*. Analysis that praises
   without recommending is a bug (POKE-7 principle). Recommendations should prefer cards
   the user owns, and clearly label what they'd need to acquire (POKE-8 principle).
4. **Meta awareness** (future) — grounding advice in current tournament reality via
   live data (e.g. Limitless TCG), because the game's meta rotates and static knowledge
   goes stale.

## Principles / what's sacred

- **Own-first advice.** Recommendations that ignore the user's collection are generic
  content the internet already has. Collection-awareness is the moat.
- **Actionable over impressive.** Every analysis output should let the user *do*
  something. Specific cards, specific counts, specific reasons.
- **Explain the why.** Users should get slightly better at deck building by using the
  app. A recommendation with a reason teaches; a bare list doesn't.
- **Correct game rules, always.** 60-card decks, 4-copy limits, legality — advice that
  breaks the game's rules destroys trust instantly. See DOMAIN.md.
- **Simple and legible over comprehensive.** A smaller feature that's obvious beats a
  bigger one that needs explaining.

## What we are deliberately NOT building

- A marketplace, price tracker, or purchase integration
- A trading platform between users
- Game simulation / playing matches in the app
- Pokémon TCG Pocket support (different game, different rules — do not mix)
- Tournament organization/management tooling

Tickets proposing these should be challenged against this list. The list can change —
but by a human editing this document, not by an agent deciding it's a good idea.

## Context worth knowing

Pokedeck is also a **showcase application**: it demonstrates a fully AI-driven
development lifecycle (agents claim tickets from Xpntl, implement in containers, open
PRs; humans review and merge) and an Azure-hosted modern web app. Code quality,
test coverage, and clean architecture are part of the point — this repo gets looked at.

Card data comes from the **pokemontcg.io API**; card IDs from that API are the
canonical join key throughout the system.

---
*Maintained by: Jay. Agents: propose edits via ticket, never modify this file directly.*
