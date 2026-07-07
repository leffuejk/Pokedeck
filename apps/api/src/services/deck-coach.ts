import type {
  DeckAnalysisDTO,
  MissingCard,
  Recommendation,
} from '@pokedeck/shared';
import { STANDARD_DECK_SIZE } from '@pokedeck/shared';
import { computeDeckMetrics, type DeckEntry } from './deck-metrics.js';
import { getFoundry } from './foundry.js';

export interface DeckAnalysisResult {
  overallScore: number;
  scores: DeckAnalysisDTO['scores'];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];
  missingCards: MissingCard[];
  model: string;
  raw: unknown;
  foundryRunId: string | null;
}

const SYSTEM_PROMPT = `You are Professor Oak's deck-analysis AI for the Pokémon Trading Card Game.
You receive a deck list plus objective computed metrics. Respond ONLY with JSON:
{
  "summary": string,                // 2-3 sentences describing this deck's strategy, key Pokémon, and overall state — specific and factual, not generic praise
  "strengths": string[],            // 2-5 items, each referencing actual cards or ratios in this deck
  "weaknesses": string[],           // 2-5 items, each describing a concrete issue with this deck
  "recommendations": [{"action":"add|remove|swap|acquire","cardName":string,"reason":string,"priority":"high|medium|low"}],
  "missingCards": [{"cardName":string,"reason":string}]  // staple cards this strategy usually wants
}

RULES — these are hard requirements:
1. recommendations[] MUST contain 1–4 items ordered high → medium → low priority. An empty array is never valid.
2. Each recommendation MUST reference actual card names, counts, or ratios from THIS deck (e.g. "Your draw-supporter count is 3 — add Iono or Professor's Research to reach 6+", or "Cut Arceus VSTAR from 3 to 2 to free space for consistency trainers").
3. Only if the deck is genuinely optimal (world-class ratios, no meaningful improvements — an extremely rare bar), set exactly one recommendation explaining in detail why no changes are needed.
4. summary must not be praise-only. Phrases like "keep tuning and it will shine" with no substance are not valid output.
Be encouraging but concrete. Specificity is mandatory.`;

/**
 * Grade a deck. Always computes deterministic metrics; if Foundry is available,
 * enriches with AI narrative + recommendations. Otherwise returns a templated
 * narrative derived from the metrics so the feature still works offline.
 */
export async function analyzeDeck(
  entries: DeckEntry[],
  deckName: string,
): Promise<DeckAnalysisResult> {
  const metrics = computeDeckMetrics(entries);
  const foundry = await getFoundry();

  if (!foundry) {
    return heuristicNarrative(metrics, deckName, entries);
  }

  const deckList = entries
    .map((e) => `${e.quantity}x ${e.card.name} (${e.card.supertype}${e.card.types?.length ? ', ' + e.card.types.join('/') : ''})`)
    .join('\n');
  const user = `Deck "${deckName}" (${metrics.total}/${STANDARD_DECK_SIZE} cards)

Computed metrics:
- Pokémon: ${metrics.pokemonCount} (basics: ${metrics.basicPokemonCount})
- Trainers: ${metrics.trainerCount} (draw/search: ${metrics.drawSupporterCount})
- Energy: ${metrics.energyCount}
- Type spread: ${JSON.stringify(metrics.typeCounts)}
- Scores (0-100): ${JSON.stringify(metrics.scores)}

Deck list:
${deckList}`;

  try {
    const json = await foundry.complete(SYSTEM_PROMPT, user);
    const parsed = JSON.parse(json) as Partial<DeckAnalysisResult>;
    return {
      overallScore: metrics.overall,
      scores: metrics.scores,
      summary: parsed.summary ?? '',
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      recommendations: parsed.recommendations ?? [],
      missingCards: (parsed.missingCards ?? []).map((m) => ({
        cardId: '',
        cardName: m.cardName,
        reason: m.reason,
        ownedElsewhere: false,
      })),
      model: 'foundry',
      raw: parsed,
      foundryRunId: null,
    };
  } catch {
    return heuristicNarrative(metrics, deckName, entries);
  }
}

/** Ask the coach a free-form question (no Foundry -> canned helpful reply). */
export async function coachReply(question: string, deckContext?: string): Promise<string> {
  const foundry = await getFoundry();
  if (!foundry) {
    return "I'm running in offline mode right now, so I can't give a full AI answer — but once Azure AI Foundry is connected I'll happily talk strategy! In the meantime, focus on ~8-12 basic Pokémon, a strong draw engine, and 9-15 energy.";
  }
  const system = `You are Professor Oak, a friendly Pokémon TCG deck coach. Answer conversationally and helpfully. Keep it concise and fun. Respond as plain text.`;
  const user = deckContext ? `Deck context:\n${deckContext}\n\nQuestion: ${question}` : question;
  // Reuse the completion surface; ask for plain text by not forcing json.
  const raw = await foundry.complete(system, `${user}\n\nReturn JSON {"reply": string}.`);
  try {
    return (JSON.parse(raw) as { reply?: string }).reply ?? raw;
  } catch {
    return raw;
  }
}

function heuristicNarrative(
  metrics: ReturnType<typeof computeDeckMetrics>,
  deckName: string,
  entries: DeckEntry[],
): DeckAnalysisResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: Recommendation[] = [];

  // ── Strengths / weaknesses ──────────────────────────────────────────────
  if (metrics.scores.consistency >= 75) {
    strengths.push('Solid consistency — enough basics and draw power to set up reliably.');
  } else {
    weaknesses.push('Consistency looks shaky — you may brick on opening hands.');
  }

  if (metrics.energyCount >= 9 && metrics.energyCount <= 15) {
    strengths.push(`Energy count (${metrics.energyCount}) is in the healthy 9-15 range.`);
  } else if (metrics.energyCount < 9) {
    weaknesses.push(`Energy count is low (${metrics.energyCount}); most decks run 9-15.`);
  } else {
    weaknesses.push(`Energy count is high (${metrics.energyCount}); consider trimming to free trainer slots.`);
  }

  const typeCount = Object.keys(metrics.typeCounts).length;
  if (typeCount > 3) {
    weaknesses.push(`Deck spreads across ${typeCount} Pokémon types — focusing on 1-2 improves consistency.`);
  }

  // ── Recommendations, high → medium → low ──────────────────────────────

  // HIGH: deck is incomplete
  if (metrics.total < STANDARD_DECK_SIZE) {
    recommendations.push({
      action: 'add',
      reason: `Deck has only ${metrics.total}/${STANDARD_DECK_SIZE} cards — add ${STANDARD_DECK_SIZE - metrics.total} more to complete it.`,
      priority: 'high',
    });
  }

  // HIGH: too few basics (mulligans)
  if (metrics.basicPokemonCount < 6 && metrics.pokemonCount > 0) {
    recommendations.push({
      action: 'add',
      reason: `Only ${metrics.basicPokemonCount} basic Pokémon — you'll mulligan frequently. Aim for 6-12 basics.`,
      priority: 'high',
    });
  }

  // HIGH: energy too low
  if (metrics.energyCount < 9) {
    recommendations.push({
      action: 'add',
      reason: `Only ${metrics.energyCount} energy — most decks run 9-15. Add more to avoid dead hands.`,
      priority: 'high',
    });
  }

  // MEDIUM: energy too high
  if (metrics.energyCount > 15) {
    recommendations.push({
      action: 'remove',
      reason: `${metrics.energyCount} energy is above the 9-15 sweet spot — trim ${metrics.energyCount - 14} to make room for trainers.`,
      priority: 'medium',
    });
  }

  // HIGH / MEDIUM: draw supporters too low
  if (metrics.drawSupporterCount < 4) {
    recommendations.push({
      action: 'add',
      cardName: "Professor's Research",
      reason: `Draw-supporter count is ${metrics.drawSupporterCount} — aim for 6-10. Add Professor's Research or Iono.`,
      priority: 'high',
    });
  } else if (metrics.drawSupporterCount < 6) {
    recommendations.push({
      action: 'add',
      cardName: 'Iono',
      reason: `Draw-supporter count is ${metrics.drawSupporterCount} — bumping to 6-8 with Iono or Professor's Research improves consistency.`,
      priority: 'medium',
    });
  }

  // MEDIUM: trainer count too low (only meaningful for a near-complete deck)
  if (metrics.trainerCount < 24 && metrics.total >= 40) {
    recommendations.push({
      action: 'add',
      reason: `Trainer count (${metrics.trainerCount}) is below the 24-34 range competitive decks use — add search or utility trainers.`,
      priority: 'medium',
    });
  }

  // LOW: type spread too wide
  if (typeCount > 3) {
    recommendations.push({
      action: 'swap',
      reason: `${typeCount} Pokémon types spreads energy requirements thin. Narrow to 1-2 attack types and replace the off-type Pokémon.`,
      priority: 'low',
    });
  }

  // Sort high → medium → low
  const PRIORITY_ORDER: Record<Recommendation['priority'], number> = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // Guarantee at least 1 recommendation — fallback to the weakest sub-score
  if (recommendations.length === 0) {
    const [worstKey, worstVal] = (Object.entries(metrics.scores) as [string, number][]).reduce(
      (min, cur) => (cur[1] < min[1] ? cur : min),
    );
    const fallbacks: Record<string, Pick<Recommendation, 'action' | 'cardName' | 'reason'>> = {
      consistency: { action: 'add', cardName: 'Iono', reason: `Consistency score is ${worstVal}/100 — adding another draw supporter like Iono could improve reliability.` },
      energyBalance: { action: 'swap', reason: `Energy balance score is ${worstVal}/100 — review your energy ratio (currently ${metrics.energyCount}) against your attack costs.` },
      typeCoverage: { action: 'swap', reason: `Type coverage score is ${worstVal}/100 — consider whether your type spread (${Object.keys(metrics.typeCounts).join(', ') || 'none'}) supports your main strategy.` },
      speed: { action: 'add', reason: `Speed score is ${worstVal}/100 — adding more basic Pokémon or draw supporters can improve early setup.` },
      resilience: { action: 'add', reason: `Resilience score is ${worstVal}/100 — increasing trainers toward the 24-34 range can stabilise mid-game.` },
      techFlexibility: { action: 'add', reason: `Tech flexibility score is ${worstVal}/100 — consider a small teched line to handle your worst matchups.` },
    };
    const msg = fallbacks[worstKey] ?? { action: 'swap', reason: 'Review your deck ratio against a proven list for this strategy.' };
    recommendations.push({ ...msg, priority: 'low' });
  }

  // Cap at 4
  const topRecs = recommendations.slice(0, 4);

  const scoreBand = metrics.overall >= 80 ? 'strong' : metrics.overall >= 60 ? 'developing' : 'early-stage';
  const summary = entries.length === 0
    ? `"${deckName}" has no cards yet. Add Pokémon, Trainers, and Energy to get started.`
    : `"${deckName}" is a ${scoreBand} build (${metrics.overall}/100) running ${metrics.pokemonCount} Pokémon, ${metrics.trainerCount} Trainers, and ${metrics.energyCount} Energy.`;

  return {
    overallScore: metrics.overall,
    scores: metrics.scores,
    summary,
    strengths,
    weaknesses,
    recommendations: topRecs,
    missingCards: [],
    model: 'heuristic',
    raw: metrics,
    foundryRunId: null,
  };
}
