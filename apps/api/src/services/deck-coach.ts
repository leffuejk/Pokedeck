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
  "summary": string,                // 2-3 warm, playful sentences
  "strengths": string[],            // 2-5 items
  "weaknesses": string[],           // 2-5 items
  "recommendations": [{"action":"add|remove|swap|acquire","cardName":string,"reason":string,"priority":"high|medium|low"}],
  "missingCards": [{"cardName":string,"reason":string}]  // staple cards this strategy usually wants
}
Be specific to the cards present. Keep the tone encouraging and fun, like a friendly professor.`;

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

  if (metrics.scores.consistency >= 75) strengths.push('Solid consistency — enough basics and draw power to set up reliably.');
  else weaknesses.push('Consistency looks shaky — you may brick on opening hands.');

  if (metrics.energyCount < 9)
    recommendations.push({ action: 'add', reason: `Only ${metrics.energyCount} energy — most decks run 9-15.`, priority: 'high' });
  else if (metrics.energyCount > 15)
    recommendations.push({ action: 'remove', reason: `${metrics.energyCount} energy is a lot — trim a few for more trainers.`, priority: 'medium' });
  else strengths.push('Energy count is in the healthy 9-15 range.');

  if (metrics.drawSupporterCount < 4)
    recommendations.push({ action: 'add', cardName: "Professor's Research", reason: 'Add a draw engine so you see more of your deck each turn.', priority: 'high' });

  if (Object.keys(metrics.typeCounts).length > 3)
    weaknesses.push('Your deck spreads across many types — consider focusing on 1-2 for consistency.');

  if (metrics.total < STANDARD_DECK_SIZE)
    recommendations.push({ action: 'add', reason: `You have ${metrics.total}/${STANDARD_DECK_SIZE} cards — add ${STANDARD_DECK_SIZE - metrics.total} more.`, priority: 'high' });

  const grade = metrics.overall >= 80 ? 'looking championship-ready' : metrics.overall >= 60 ? 'coming together nicely' : 'a promising work in progress';
  return {
    overallScore: metrics.overall,
    scores: metrics.scores,
    summary: `"${deckName}" is ${grade}! It runs ${metrics.pokemonCount} Pokémon, ${metrics.trainerCount} Trainers, and ${metrics.energyCount} Energy. ${entries.length ? 'Keep tuning and it will shine.' : 'Add some cards to get started!'}`,
    strengths,
    weaknesses,
    recommendations,
    missingCards: [],
    model: 'heuristic',
    raw: metrics,
    foundryRunId: null,
  };
}
