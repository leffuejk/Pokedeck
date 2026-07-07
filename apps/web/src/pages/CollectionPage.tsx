import { useState } from 'react';
import { CARD_SUPERTYPES, POKEMON_TYPES } from '@pokedeck/shared';
import type { CardDTO } from '@pokedeck/shared';
import { useCards } from '../hooks/useCards';
import {
  useCollection,
  useOwnedMap,
  useRemoveCollection,
  useUpsertCollection,
} from '../hooks/useCollection';
import { filterOwnedCards } from '../lib/collectionFilters';
import { PageHeader } from '../components/AppShell';
import { CardTile } from '../components/CardTile';
import { TypeBadge } from '../components/TypeBadge';
import { QuantityStepper } from '../components/QuantityStepper';
import { LoadingBlock } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { cn } from '../lib/utils';

export function CollectionPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('');
  const [supertype, setSupertype] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showOwned, setShowOwned] = useState(false);

  const filters = { query, type, supertype, page };
  const { data, isLoading: cardsLoading, isFetching, isError } = useCards(filters);
  const { data: collectionData, isLoading: collectionLoading } = useCollection();

  const owned = useOwnedMap();
  const upsert = useUpsertCollection();
  const remove = useRemoveCollection();

  const isLoading = showOwned ? collectionLoading : cardsLoading;
  const ownedCards = filterOwnedCards(collectionData ?? [], { query, supertype, type });
  const displayCards: CardDTO[] = showOwned ? ownedCards : (data?.items ?? []);
  const collectionIsEmpty = showOwned && (collectionData ?? []).length === 0;

  const setQuantity = (card: CardDTO, next: number) => {
    if (next <= 0) remove.mutate(card.id);
    else upsert.mutate({ cardId: card.id, quantity: next });
  };

  const resetToFirstPage = () => setPage(1);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Collection"
        subtitle="Search cards and track the ones you own."
      />

      {/* Filter bar */}
      <div className="pd-card sticky top-[68px] z-20 mb-5 space-y-3 p-4">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => { setShowOwned(false); resetToFirstPage(); }}
            className={cn(
              'pd-chip border px-3 py-1',
              !showOwned ? 'border-brand bg-brand text-white' : 'border-border bg-surface-2 text-muted',
            )}
          >
            All cards
          </button>
          <button
            type="button"
            onClick={() => { setShowOwned(true); resetToFirstPage(); }}
            className={cn(
              'pd-chip border px-3 py-1',
              showOwned ? 'border-brand bg-brand text-white' : 'border-border bg-surface-2 text-muted',
            )}
          >
            My collection
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="pd-input"
            placeholder="Search cards by name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetToFirstPage();
            }}
          />
          <select
            aria-label="Filter by supertype"
            className="pd-input sm:w-56"
            value={supertype}
            onChange={(e) => {
              setSupertype(e.target.value);
              resetToFirstPage();
            }}
          >
            <option value="">All supertypes</option>
            {CARD_SUPERTYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setType('');
              resetToFirstPage();
            }}
            className={cn(
              'pd-chip border px-3 py-1',
              type === '' ? 'border-brand bg-brand text-white' : 'border-border bg-surface-2 text-muted',
            )}
          >
            All types
          </button>
          {POKEMON_TYPES.map((t) => (
            <TypeBadge
              key={t}
              type={t}
              interactive
              selected={type === t}
              onClick={() => {
                setType(type === t ? '' : t);
                resetToFirstPage();
              }}
            />
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock label="Fetching cards..." />
      ) : !showOwned && isError ? (
        <EmptyState emoji={"😵"} title="Couldn't load cards" description="Please try again shortly." />
      ) : displayCards.length === 0 ? (
        <EmptyState
          emoji={collectionIsEmpty ? "📦" : "🔍"}
          title={collectionIsEmpty ? "Your collection is empty" : "No cards found"}
          description={collectionIsEmpty ? "Add cards using the quantity controls to build your collection." : "Try a different search or clear your filters."}
        />
      ) : (
        <>
          <div
            className={cn(
              'grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
              !showOwned && isFetching && 'opacity-60',
            )}
          >
            {displayCards.map((card) => {
              const qty = owned.get(card.id) ?? 0;
              return (
                <CardTile
                  key={card.id}
                  card={card}
                  owned={qty}
                  footer={
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-muted">Owned</span>
                      <QuantityStepper
                        value={qty}
                        min={0}
                        max={99}
                        onChange={(n) => setQuantity(card, n)}
                        busy={upsert.isPending || remove.isPending}
                      />
                    </div>
                  }
                />
              );
            })}
          </div>

          {/* Pagination - only in All cards mode */}
          {!showOwned && data && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                className="pd-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="text-sm font-bold text-muted">
                Page {data.page} of {totalPages}
              </span>
              <button
                type="button"
                className="pd-btn-ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
