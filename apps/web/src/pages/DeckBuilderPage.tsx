import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MAX_COPIES_PER_CARD, STANDARD_DECK_SIZE } from '@pokedeck/shared';
import type { CardDTO, DeckCardDTO } from '@pokedeck/shared';
import { useDeck, useUpdateDeckCard } from '../hooks/useDeck';
import { useCollection } from '../hooks/useCollection';
import { useAnalyzeDeck } from '../hooks/useAnalyzeDeck';
import { ProgressRing } from '../components/ProgressRing';
import { QuantityStepper } from '../components/QuantityStepper';
import { TypeBadge } from '../components/TypeBadge';
import { LoadingBlock, Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { typesGradient } from '../lib/typeColors';
import { cn } from '../lib/utils';

export function DeckBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deck, isLoading, isError } = useDeck(id);
  const { data: collection } = useCollection();
  const update = useUpdateDeckCard(id ?? '');
  const analyze = useAnalyzeDeck(id ?? '');

  const [search, setSearch] = useState('');

  // Map of cardId -> quantity currently in the deck's main zone.
  const deckQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of deck?.cards ?? []) {
      if (c.zone === 'main') map.set(c.cardId, c.quantity);
    }
    return map;
  }, [deck]);

  const mainCards = useMemo(
    () => (deck?.cards ?? []).filter((c) => c.zone === 'main'),
    [deck],
  );

  const filteredCollection = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (collection ?? []).filter((item) =>
      term ? item.card.name.toLowerCase().includes(term) : true,
    );
  }, [collection, search]);

  if (isLoading) return <LoadingBlock label="Loading deck…" />;
  if (isError || !deck)
    return (
      <EmptyState
        emoji="😵"
        title="Deck not found"
        description="It may have been deleted."
        action={
          <Link to="/app/decks" className="pd-btn-primary">
            Back to decks
          </Link>
        }
      />
    );

  const setDeckQuantity = (card: CardDTO, next: number) => {
    const owned = collection?.find((i) => i.cardId === card.id)?.quantity ?? 0;
    const capped = Math.min(next, MAX_COPIES_PER_CARD, owned);
    update.mutate({ cardId: card.id, quantity: Math.max(0, capped), zone: 'main' });
  };

  const runAnalysis = () => {
    analyze.mutate(undefined, {
      onSuccess: () => navigate(`/app/decks/${deck.id}/analysis`),
    });
  };

  const total = deck.cardCount;
  const complete = total >= STANDARD_DECK_SIZE;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/app/decks" className="text-sm font-bold text-muted hover:text-ink">
            ← Decks
          </Link>
          <h1 className="text-2xl font-black sm:text-3xl">{deck.name}</h1>
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            {deck.format}
          </span>
        </div>
        <button
          className="pd-btn-primary text-base"
          onClick={runAnalysis}
          disabled={analyze.isPending || total === 0}
        >
          {analyze.isPending ? (
            <>
              <Spinner size={18} /> Grading…
            </>
          ) : (
            <>🎓 Ask the Professor to grade this deck</>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left: current deck */}
        <section className="lg:sticky lg:top-[80px] lg:self-start">
          <div className="pd-card p-5">
            <div className="flex items-center gap-4">
              <ProgressRing
                value={total}
                max={STANDARD_DECK_SIZE}
                size={104}
                stroke={11}
                sublabel="cards"
              />
              <div>
                <div className="font-display text-lg font-extrabold">
                  {complete ? 'Deck is full! 🎉' : `${STANDARD_DECK_SIZE - total} to go`}
                </div>
                <p className="mt-1 text-sm text-muted">
                  A legal {deck.format} deck needs exactly {STANDARD_DECK_SIZE} cards, max{' '}
                  {MAX_COPIES_PER_CARD} of each.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {mainCards.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  No cards yet — add some from your collection on the right. →
                </p>
              ) : (
                mainCards.map((dc) => (
                  <DeckLine
                    key={dc.cardId}
                    dc={dc}
                    onChange={(n) => setDeckQuantity(dc.card, n)}
                    busy={update.isPending}
                    ownedMax={collection?.find((i) => i.cardId === dc.cardId)?.quantity ?? 0}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right: collection picker */}
        <section>
          <div className="pd-card mb-4 p-4">
            <input
              className="pd-input"
              placeholder="Search your collection…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {(collection ?? []).length === 0 ? (
            <EmptyState
              emoji="🗂️"
              title="Your collection is empty"
              description="Add cards to your collection first — the builder only offers cards you own."
              action={
                <Link to="/app/collection" className="pd-btn-primary">
                  Go to Collection
                </Link>
              }
            />
          ) : filteredCollection.length === 0 ? (
            <EmptyState emoji="🔍" title="No matches" description="Try another search." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCollection.map((item) => {
                const inDeck = deckQty.get(item.cardId) ?? 0;
                const max = Math.min(MAX_COPIES_PER_CARD, item.quantity);
                return (
                  <PickerRow
                    key={item.cardId}
                    card={item.card}
                    owned={item.quantity}
                    inDeck={inDeck}
                    max={max}
                    busy={update.isPending}
                    onChange={(n) => setDeckQuantity(item.card, n)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DeckLine({
  dc,
  onChange,
  busy,
  ownedMax,
}: {
  dc: DeckCardDTO;
  onChange: (n: number) => void;
  busy: boolean;
  ownedMax: number;
}) {
  const image = dc.card.smallImageUrl ?? dc.card.largeImageUrl;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/50 p-2">
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md" style={{ background: typesGradient(dc.card.types) }}>
        {image && <img src={image} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold" title={dc.card.name}>
          {dc.card.name}
        </div>
        <div className="text-[11px] text-muted">{dc.card.supertype}</div>
      </div>
      <QuantityStepper
        value={dc.quantity}
        min={0}
        max={Math.min(MAX_COPIES_PER_CARD, ownedMax)}
        onChange={onChange}
        busy={busy}
      />
    </div>
  );
}

function PickerRow({
  card,
  owned,
  inDeck,
  max,
  busy,
  onChange,
}: {
  card: CardDTO;
  owned: number;
  inDeck: number;
  max: number;
  busy: boolean;
  onChange: (n: number) => void;
}) {
  const image = card.smallImageUrl ?? card.largeImageUrl;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-2.5 transition-colors',
        inDeck > 0 ? 'border-brand/50 bg-brand-soft/40' : 'border-border bg-surface',
      )}
    >
      <div
        className="h-14 w-10 shrink-0 overflow-hidden rounded-md"
        style={{ background: typesGradient(card.types) }}
      >
        {image && <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold" title={card.name}>
          {card.name}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {(card.types ?? []).slice(0, 1).map((t) => (
            <TypeBadge key={t} type={t} size="sm" />
          ))}
          <span className="text-[11px] font-bold text-muted">own ×{owned}</span>
        </div>
      </div>
      <QuantityStepper value={inDeck} min={0} max={max} onChange={onChange} busy={busy} />
    </div>
  );
}
