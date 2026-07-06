import type { DeckScoreBreakdown } from '@pokedeck/shared';
import type { Card } from '../db/schema.js';

export interface DeckEntry {
  card: Card;
  quantity: number;
}

export interface DeckMetrics {
  total: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  basicPokemonCount: number;
  typeCounts: Record<string, number>;
  drawSupporterCount: number;
  scores: DeckScoreBreakdown;
  overall: number;
}

const DRAW_ENGINE_HINTS = [
  "Professor's Research",
  'Research',
  'Bibarel',
  'Iono',
  'Colress',
  'Cynthia',
  'Judge',
  'Marnie',
  'Trainers',
  'Hop',
  'Jacq',
  'Arven',
];

/**
 * Deterministic deck heuristics — the objective grounding we feed to the AI coach
 * (and a full fallback when Foundry isn't configured). Scores are 0–100.
 */
export function computeDeckMetrics(entries: DeckEntry[]): DeckMetrics {
  let pokemonCount = 0;
  let trainerCount = 0;
  let energyCount = 0;
  let basicPokemonCount = 0;
  let drawSupporterCount = 0;
  const typeCounts: Record<string, number> = {};

  for (const { card, quantity } of entries) {
    if (card.supertype === 'Pokémon') {
      pokemonCount += quantity;
      if (card.subtypes?.includes('Basic')) basicPokemonCount += quantity;
      for (const t of card.types ?? []) typeCounts[t] = (typeCounts[t] ?? 0) + quantity;
    } else if (card.supertype === 'Trainer') {
      trainerCount += quantity;
      if (DRAW_ENGINE_HINTS.some((h) => card.name.includes(h))) drawSupporterCount += quantity;
    } else {
      energyCount += quantity;
    }
  }

  const total = pokemonCount + trainerCount + energyCount;
  const distinctTypes = Object.keys(typeCounts).length;

  // Consistency: enough basics to reliably open + a real draw engine.
  const consistency = clamp(
    scaleAround(basicPokemonCount, 8, 14) * 0.6 + scaleAround(drawSupporterCount, 4, 10) * 0.4,
  );

  // Energy balance: ~9–15 energy is typical; too few/many is penalized.
  const energyBalance = clamp(scaleAround(energyCount, 9, 15));

  // Type coverage: 1–2 attacking types is focused (good); >3 is unfocused.
  const typeCoverage = clamp(distinctTypes <= 2 ? 90 : distinctTypes === 3 ? 70 : 45);

  // Speed: proxy from basic ratio + draw engine (faster setup).
  const speed = clamp((basicPokemonCount / Math.max(pokemonCount, 1)) * 100 * 0.6 + drawSupporterCount * 4);

  // Resilience: trainer density (gusts, switches, recovery) as a rough proxy.
  const resilience = clamp(scaleAround(trainerCount, 24, 34));

  // Tech flexibility: a little slack (fewer 4-ofs) implies room for tech.
  const techFlexibility = clamp(60 + (distinctTypes >= 2 ? 10 : 0));

  const scores: DeckScoreBreakdown = {
    consistency: round(consistency),
    energyBalance: round(energyBalance),
    typeCoverage: round(typeCoverage),
    speed: round(speed),
    resilience: round(resilience),
    techFlexibility: round(techFlexibility),
  };

  // Overall weighted toward consistency + energy (they win games).
  const overall = round(
    scores.consistency * 0.3 +
      scores.energyBalance * 0.2 +
      scores.typeCoverage * 0.15 +
      scores.speed * 0.15 +
      scores.resilience * 0.15 +
      scores.techFlexibility * 0.05,
  );

  return {
    total,
    pokemonCount,
    trainerCount,
    energyCount,
    basicPokemonCount,
    typeCounts,
    drawSupporterCount,
    scores,
    overall,
  };
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}
function round(n: number): number {
  return Math.round(n * 10) / 10;
}
/** 100 when value is within [lo,hi], tapering to 0 as it moves away. */
function scaleAround(value: number, lo: number, hi: number): number {
  if (value >= lo && value <= hi) return 100;
  const dist = value < lo ? lo - value : value - hi;
  return clamp(100 - dist * 12);
}
