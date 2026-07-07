# Pokémon TCG Domain Knowledge

> Reference for all agents working on Pokedeck. This covers the **physical Pokémon
> Trading Card Game**. ⚠️ **Pokémon TCG Pocket is a DIFFERENT GAME** (mobile app,
> 20-card decks, different rules). Web search results mix them constantly — if a
> source says "Pocket," it does not apply here.

## Game fundamentals

- Two players, each with a **60-card deck**. Each player sets aside **6 prize cards**
  at the start; you take one each time you knock out an opposing Pokémon.
- **Win conditions:** take all 6 of your prizes; or your opponent has no Pokémon left
  in play; or your opponent cannot draw a card at the start of their turn ("deck out").
- Each player has one **Active** Pokémon and up to **5 Benched** Pokémon.
- Pokémon attack using attached **Energy** cards matching their attack costs.
- Stronger Pokémon (e.g. "ex" cards) give up **2 prizes** when knocked out instead
  of 1 — power comes at prize-trade risk. (Older mechanics like V/VMAX/GX behave
  similarly; the collection may contain cards from any era.)

## Deck construction rules (hard constraints — advice violating these is a bug)

1. Deck must be **exactly 60 cards**.
2. **Maximum 4 copies of any card by name** (across all printings/sets), EXCEPT
   **basic Energy**, which has no copy limit.
3. Deck must contain **at least 1 Basic Pokémon** (you must be able to start the game).
4. **Format legality** depends on the format (see Formats below). The pokemontcg.io
   API exposes per-card `legalities` — use that data, never guess legality.

## Card supertypes (pokemontcg.io: `supertype`)

- **Pokémon** — subtypes include Basic, Stage 1, Stage 2 (evolution chain: a Stage 1
  must evolve from its Basic; Stage 2 from its Stage 1 — a deck running a Stage 2
  needs the lower stages or a way to cheat them into play).
- **Trainer** — subtypes matter a lot:
  - **Item**: play any number per turn.
  - **Supporter**: **only 1 per turn** — this is why "draw Supporter count" is a core
    consistency metric.
  - **Stadium**: one in play at a time; replaces the previous.
  - **Pokémon Tool**: attaches to a Pokémon.
- **Energy** — **Basic Energy** (no copy limit) vs **Special Energy** (4-copy limit,
  extra effects).

## Formats

- **Standard**: the main competitive format; a rotating window of recent sets.
  As of **July 2026** the Standard window is designated **TEF–CRI** (Temporal Forces
  through Chaos Rising) on Limitless. Rotation happens roughly annually — verify
  current legality via card `legalities` data, not memory.
- **Expanded**: larger card pool, less commonly played.
- **Unlimited/casual**: anything goes; many Pokedeck users play kitchen-table games
  where legality matters less. Don't assume every user targets Standard — but when
  analysis speaks to competitiveness, Standard is the default frame.

## Deck architecture concepts (vocabulary for analysis & recommendations)

- **Consistency engine**: the draw/search backbone that makes a deck function —
  draw Supporters, search Items (Poké Ball variants, evolution search), and
  ability-based draw Pokémon. Rule of thumb: competitive decks run a substantial
  Trainer core (often 28–38 Trainers) and roughly **6–10 draw Supporters**; decks
  far below that are inconsistent.
- **Energy acceleration**: attaching Energy beyond the 1-per-turn manual attachment
  (abilities, Items, attacks). Decks with expensive attacks need acceleration or
  they're too slow.
- **Gust effects**: forcing the opponent's Benched Pokémon into the Active spot
  (e.g. Boss's Orders-style cards) — near-mandatory in competitive decks for
  taking targeted knockouts.
- **Switching**: cards that move your own Active to the Bench. Decks with high
  retreat costs and no switching get stranded.
- **Prize trade**: the math of what each side gives up per knockout. Single-prize
  attackers beating 2-prize "ex" Pokémon is favorable trading.
- **Tech card**: a 1-of included to answer a specific matchup or threat.
- **Archetype shapes**: aggro (fast damage), control/stall (deny resources, win
  slow), toolbox (flexible attackers for different situations), turbo/engine decks
  (accelerate into one big attacker), mill (deck-out wins).

## Common deck flaws (heuristics the Deck Doctor should detect)

1. Not exactly 60 cards / copy-limit violations / zero Basics — **rule violations,
   flag before anything else**.
2. Too few Basic Pokémon overall (~fewer than 8–10): high mulligan risk, weak starts.
3. Low draw-Supporter count (< ~6): the deck will brick.
4. No gust effects: can't take targeted knockouts.
5. No switching for high-retreat Pokémon: gets stranded.
6. Energy mismatch: types or counts that don't match attackers' costs, or too few /
   too many Energy for the deck's attack curve (very roughly 8–15 in most decks,
   heavily archetype-dependent).
7. Evolution lines with missing stages or bad ratios (e.g. 1 Basic for a 3-copy
   Stage 2 line), with no search/cheat cards to fix it.
8. Prize-trade problems: a deck of nothing but 2-prize Pokémon with no single-prize
   attackers can lose the trade war.
9. No win condition clarity: a pile of individually good cards with no coherent
   game plan.

## Current meta snapshot — ⚠️ STALENESS WARNING

**Snapshot date: July 2026. The meta shifts with every set release and rotation.**
Treat everything in this section as "probably right for a few months." For real
current data, the authority is **Limitless TCG (limitlesstcg.com)** — tournament
results, usage rates, and decklists. Feature work that needs live meta awareness
should ingest data, not rely on this file.

As of the July 2026 Standard format (TEF–CRI), prominent archetypes include:

- **Dragapult ex** variants — top-tier, strongest with Dusknoir support
- **N's Zoroark ex** — strong draw engine; recently improved by Transformation Tome
  fixing its board-space problems; often paired with Pecharunt ex
- **Alakazam** — polarized matchups (many near-autowins, struggles vs Dragapult)
- **Crustle** defensive builds — Mysterious Rock Inn damage prevention + healing
  (Growing Energy, Hero's Cape)
- **Metagross** — significantly boosted by the Chaos Rising set
- **Slowking** — aggressive control
- Notable meta cards: Eri and resource-denial effects, Crushing Hammer energy
  denial, Budew, Fezandipiti ex, Munkidori, Dusknoir

## Pokedeck-specific conventions

- Card data source: **pokemontcg.io API**. Its card **IDs are the canonical join
  key** everywhere (collection, decks, recommendations). Match on IDs, never fuzzy
  name matching.
- `supertype` values: `Pokémon`, `Trainer`, `Energy` (bucket unknowns into "Other"
  rather than dropping them — POKE-6 convention).
- The user's collection may contain cards from **any era** (e.g. V-era cards);
  don't assume Standard legality of owned cards.
- Analysis outputs must follow the POKE-7 principle: **always actionable, never
  praise-only**, and (post-POKE-8) collection-aware — prefer recommending owned
  cards, clearly label acquisitions.

---
*Snapshot maintained by humans + periodic research. Agents: if a decision depends on
current meta facts, prefer live data or flag the staleness risk in your output.*
