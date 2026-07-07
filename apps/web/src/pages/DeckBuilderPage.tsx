import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MAX_COPIES_PER_CARD, STANDARD_DECK_SIZE } from '@pokedeck/shared';
import type { CardDTO } from '@pokedeck/shared';
import { useDeck, useUpdateDeckCard } from '../hooks/useDeck';
import { useCollection } from '../hooks/useCollection';
import { useAnalyzeDeck } from '../hooks/useAnalyzeDeck';
import { CardTile } from '../components/CardTile';
import { ProgressRing } from '../components/ProgressRing';
import { QuantityStepper } from '../components/QuantityStepper';
import { TypeBadge } from '../components/TypeBadge';
import { LoadingBlock, Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { typesGradient } from '../lib/typeColors';
import { cn } from '../lib/utils';
import { groupDeckCardsByBucket, DECK_BUCKETS } from '../lib/deckBuckets';

export function DeckBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deck, isLoading, isError } = useDeck(id);
  const { data: collection } = useCollection();
  const update = useUpdateDeckCard(id ?? '');
  const analyze = useAnalyzeDeck(id ?? '');

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

  const buckets = useMemo(() => groupDeckCardsByBucket(mainCards), [mainCards]);

  const filteredCollection = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (collection ?? []).filter((item) =>
      term ? item.card.name.toLowerCase().includes(term) : true,
    );
  }, [collection, search]);

  const closeModal = useCallback(() => setModalOpen(false), []);

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
      {/* Header */}
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
        <div className="flex flex-wrap gap-2">
          <button className="pd-btn-ghost text-base" onClick={() => setModalOpen(true)}>
            Browse collection
          </button>
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
      </div>

      {/* Progress summary */}
      <div className="pd-card mb-6 flex flex-wrap items-center gap-4 p-5">
        <ProgressRing value={total} max={STANDARD_DECK_SIZE} size={104} stroke={11} sublabel="cards" />
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

      {/* Bucketed deck cards */}
      {mainCards.length === 0 ? (
        <EmptyState
          emoji="🃏"
          title="Deck is empty"
          description="Open your collection to start adding cards."
          action={
            <button className="pd-btn-primary" onClick={() => setModalOpen(true)}>
              Browse collection
            </button>
          }
        />
      ) : (
        DECK_BUCKETS.map((bucket) => {
          const cards = buckets[bucket];
          if (cards.length === 0) return null;
          const bucketTotal = cards.reduce((sum, dc) => sum + dc.quantity, 0);
          return (
            <section key={bucket} className="mb-8">
              <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-muted">
                {bucket} ({bucketTotal})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {cards.map((dc) => (
                  <CardTile
                    key={dc.cardId}
                    card={dc.card}
                    owned={dc.quantity}
                    footer={
                      <QuantityStepper
                        value={dc.quantity}
                        min={0}
                        max={Math.min(
                          MAX_COPIES_PER_CARD,
                          collection?.find((i) => i.cardId === dc.cardId)?.quantity ?? dc.quantity,
                        )}
                        onChange={(n) => setDeckQuantity(dc.card, n)}
                        busy={update.isPending}
                      />
                    }
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Collection modal */}
      {modalOpen && (
        <CollectionModal onClose={closeModal}>
          <div className="mb-4">
            <input
              className="pd-input"
              placeholder="Search your collection…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {(collection ?? []).length === 0 ? (
            <EmptyState
              emoji="🗂️"
              title="Your collection is empty"
              description="Add cards to your collection first — the builder only offers cards you own."
              action={
                <Link to="/app/collection" className="pd-btn-primary" onClick={closeModal}>
                  Go to Collection
                </Link>
              }
            />
          ) : filteredCollection.length === 0 ? (
            <EmptyState emoji="🔍" title="No matches" description="Try another search." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        </CollectionModal>
      )}
    </div>
  );
}

function CollectionModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto my-8 max-w-3xl px-4 pb-8">
        <div className="pd-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">Browse Collection</h2>
            <button
              className="pd-btn-ghost px-3 py-1.5 text-sm"
              onClick={onClose}
              aria-label="Close collection browser"
            >
              ✕ Close
            </button>
          </div>
          {children}
        </div>
      </div>
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
