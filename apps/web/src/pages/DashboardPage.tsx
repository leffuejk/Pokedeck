import { Link } from 'react-router-dom';
import { useMe } from '../hooks/useMe';
import { useCollection } from '../hooks/useCollection';
import { useDecks } from '../hooks/useDecks';
import { useLatestAnalysis } from '../hooks/useAnalyzeDeck';
import { PageHeader } from '../components/AppShell';
import { ScoreGauge } from '../components/ScoreGauge';
import { Mascot } from '../components/Mascot';
import { timeAgo } from '../lib/utils';

export function DashboardPage() {
  const { data: user } = useMe();
  const { data: collection } = useCollection();
  const { data: decks } = useDecks();

  // Most recently updated deck drives the "last analysis" tile.
  const recentDeck = decks?.[0];
  const { latest } = useLatestAnalysis(recentDeck?.id);

  const ownedCount = (collection ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCards = collection?.length ?? 0;
  const deckCount = decks?.length ?? 0;

  const firstName = (user?.name ?? '').split(' ')[0] || 'Trainer';

  return (
    <div>
      <PageHeader
        title={`Hey ${firstName}! 👋`}
        subtitle="Here’s your deck lab at a glance."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          emoji="🗂️"
          label="Collection"
          value={ownedCount.toLocaleString()}
          hint={`${uniqueCards} unique card${uniqueCards === 1 ? '' : 's'}`}
          to="/app/collection"
          accent="rgb(var(--pd-accent))"
        />
        <StatTile
          emoji="🃏"
          label="Decks"
          value={String(deckCount)}
          hint={deckCount === 0 ? 'Build your first!' : 'in your lab'}
          to="/app/decks"
          accent="rgb(var(--pd-brand))"
        />
        <Link
          to={recentDeck ? `/app/decks/${recentDeck.id}/analysis` : '/app/decks'}
          className="pd-card flex items-center justify-between gap-3 p-5 transition-transform duration-200 ease-spring hover:-translate-y-1"
        >
          <div>
            <div className="text-sm font-bold text-muted">Last analysis</div>
            <div className="mt-1 font-display text-lg font-extrabold">
              {recentDeck ? recentDeck.name : 'No decks yet'}
            </div>
            {latest && (
              <div className="mt-1 text-xs text-muted">graded {timeAgo(latest.createdAt)}</div>
            )}
          </div>
          <ScoreGauge score={latest?.overallScore ?? null} size={120} stroke={12} />
        </Link>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <QuickLink
          to="/app/collection"
          emoji="➕"
          title="Add cards"
          body="Grow your collection so the builder knows what you own."
        />
        <QuickLink
          to="/app/decks"
          emoji="🛠️"
          title="Build a deck"
          body="Assemble 60 cards with live legality checks."
        />
        <QuickLink
          to="/app/coach"
          emoji="🎓"
          title="Ask the Coach"
          body="Chat with the AI Professor about strategy."
        />
      </div>

      {/* Welcome / mascot band */}
      <div className="pd-card mt-6 flex flex-col items-center gap-4 overflow-hidden bg-gradient-to-br from-brand-soft to-surface p-6 sm:flex-row sm:p-8">
        <Mascot size={120} />
        <div>
          <h2 className="text-xl font-black">The Professor is ready when you are.</h2>
          <p className="mt-1 max-w-lg text-muted">
            Pick a deck and hit <span className="font-bold text-ink">“Ask the Professor to grade
            this deck”</span> to get a six-axis breakdown, strengths, weaknesses, and the exact cards
            to chase next.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  emoji,
  label,
  value,
  hint,
  to,
  accent,
}: {
  emoji: string;
  label: string;
  value: string;
  hint: string;
  to: string;
  accent: string;
}) {
  return (
    <Link
      to={to}
      className="pd-card group relative overflow-hidden p-5 transition-transform duration-200 ease-spring hover:-translate-y-1"
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-15 transition-transform duration-300 group-hover:scale-125"
        style={{ background: accent }}
      />
      <div className="text-2xl">{emoji}</div>
      <div className="mt-2 text-sm font-bold text-muted">{label}</div>
      <div className="font-display text-4xl font-black tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </Link>
  );
}

function QuickLink({
  to,
  emoji,
  title,
  body,
}: {
  to: string;
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="pd-card flex items-start gap-3 p-5 transition-transform duration-200 ease-spring hover:-translate-y-1"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl2 bg-surface-2 text-xl">
        {emoji}
      </div>
      <div>
        <h3 className="font-extrabold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
    </Link>
  );
}
