import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MissingCard, Recommendation } from '@pokedeck/shared';
import { useDeck } from '../hooks/useDeck';
import { useAnalyzeDeck, useLatestAnalysis } from '../hooks/useAnalyzeDeck';
import { useArchetypes } from '../hooks/useArchetypes';
import { ScoreGauge } from '../components/ScoreGauge';
import { StatRadar } from '../components/StatRadar';
import { Confetti } from '../components/Confetti';
import { Spinner, LoadingBlock } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { timeAgo } from '../lib/utils';

export function DeckAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { data: deck } = useDeck(id);
  const { latest, isLoading } = useLatestAnalysis(id);
  const analyze = useAnalyzeDeck(id ?? '');
  const { data: archetypes } = useArchetypes();

  const [celebrate, setCelebrate] = useState(false);
  const score = latest?.overallScore ?? null;

  // Celebrate great scores once when the analysis first appears.
  useEffect(() => {
    if (score != null && score >= 85) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 500);
      return () => clearTimeout(t);
    }
  }, [score, latest?.id]);

  const archetype = archetypes?.find((a) => a.id === latest?.suggestedArchetypeId);

  if (isLoading) return <LoadingBlock label="Loading analysis…" />;

  return (
    <div>
      <Confetti fire={celebrate} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={`/app/decks/${id}`}
            className="text-sm font-bold text-muted hover:text-ink"
          >
            ← Back to builder
          </Link>
          <h1 className="text-2xl font-black sm:text-3xl">
            {deck?.name ?? 'Deck'} — Professor’s Report
          </h1>
          {latest && (
            <p className="text-sm text-muted">Graded {timeAgo(latest.createdAt)}</p>
          )}
        </div>
        <button
          className="pd-btn-primary"
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
        >
          {analyze.isPending ? (
            <>
              <Spinner size={18} /> Re-grading…
            </>
          ) : (
            <>🔄 Re-grade</>
          )}
        </button>
      </div>

      {!latest ? (
        <EmptyState
          emoji="🎓"
          title="Not graded yet"
          description="Ask the Professor to grade this deck to see a full breakdown."
          action={
            <button className="pd-btn-primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
              {analyze.isPending ? 'Grading…' : 'Grade this deck'}
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Score + radar */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="pd-card flex flex-col items-center justify-center gap-3 p-6">
              <ScoreGauge score={score} size={240} caption="Overall score" />
              {score != null && score >= 85 && (
                <span className="pd-chip animate-spring-in bg-green-500/15 px-3 py-1 text-green-600 dark:text-green-400">
                  ✨ Championship-ready!
                </span>
              )}
              {archetype && (
                <div className="text-center text-sm text-muted">
                  Plays like{' '}
                  <span className="font-bold text-ink">{archetype.name}</span>
                  {archetype.playstyle && ` · ${archetype.playstyle}`}
                </div>
              )}
            </div>

            <div className="pd-card flex flex-col items-center justify-center p-6">
              {latest.scores ? (
                <StatRadar scores={latest.scores} size={300} />
              ) : (
                <p className="text-muted">No axis breakdown available.</p>
              )}
            </div>
          </div>

          {/* Summary */}
          {latest.summary && (
            <div className="pd-card bg-gradient-to-br from-brand-soft to-surface p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎓</span>
                <p className="text-lg font-medium leading-relaxed">{latest.summary}</p>
              </div>
            </div>
          )}

          {/* Strengths & weaknesses */}
          <div className="grid gap-6 md:grid-cols-2">
            <ListCard
              title="Strengths"
              emoji="💪"
              accent="text-green-600 dark:text-green-400"
              items={latest.strengths}
              bullet="✓"
            />
            <ListCard
              title="Weaknesses"
              emoji="⚠️"
              accent="text-amber-600 dark:text-amber-400"
              items={latest.weaknesses}
              bullet="•"
            />
          </div>

          {/* Recommendations */}
          {latest.recommendations && latest.recommendations.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-black">Recommendations</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {latest.recommendations.map((rec, i) => (
                  <RecCard key={i} rec={rec} />
                ))}
              </div>
            </section>
          )}

          {/* Missing cards */}
          {latest.missingCards && latest.missingCards.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-black">Missing cards to chase</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {latest.missingCards.map((mc) => (
                  <MissingCardRow key={mc.cardId} card={mc} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  emoji,
  accent,
  items,
  bullet,
}: {
  title: string;
  emoji: string;
  accent: string;
  items: string[] | null;
  bullet: string;
}) {
  return (
    <div className="pd-card p-5">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <span>{emoji}</span> {title}
      </h3>
      {items && items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className={`font-black ${accent}`}>{bullet}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Nothing noted.</p>
      )}
    </div>
  );
}

const PRIORITY_STYLES: Record<Recommendation['priority'], string> = {
  high: 'bg-brand/15 text-brand',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  low: 'bg-slate-500/15 text-muted',
};

const ACTION_EMOJI: Record<Recommendation['action'], string> = {
  add: '➕',
  remove: '➖',
  swap: '🔄',
  acquire: '🛒',
};

function RecCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="pd-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="pd-chip bg-surface-2 px-2 py-0.5 text-[11px] uppercase">
          {ACTION_EMOJI[rec.action]} {rec.action}
        </span>
        <span className={`pd-chip px-2 py-0.5 text-[11px] uppercase ${PRIORITY_STYLES[rec.priority]}`}>
          {rec.priority}
        </span>
      </div>
      {rec.cardName && <div className="mt-2 font-display font-extrabold">{rec.cardName}</div>}
      <p className="mt-1 text-sm text-muted">{rec.reason}</p>
    </div>
  );
}

function MissingCardRow({ card }: { card: MissingCard }) {
  return (
    <div className="pd-card flex items-start gap-3 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-lg">
        {card.ownedElsewhere ? '📦' : '🛒'}
      </div>
      <div>
        <div className="font-display font-extrabold">{card.cardName}</div>
        <p className="mt-0.5 text-sm text-muted">{card.reason}</p>
        {card.ownedElsewhere && (
          <span className="mt-1 inline-block text-[11px] font-bold text-green-600 dark:text-green-400">
            You already own this elsewhere
          </span>
        )}
      </div>
    </div>
  );
}
