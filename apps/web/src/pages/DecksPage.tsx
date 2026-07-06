import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DECK_FORMATS, STANDARD_DECK_SIZE } from '@pokedeck/shared';
import type { DeckDTO, DeckFormat } from '@pokedeck/shared';
import { useCreateDeck, useDecks, useDeleteDeck } from '../hooks/useDecks';
import { PageHeader } from '../components/AppShell';
import { ProgressRing } from '../components/ProgressRing';
import { TypeBadge } from '../components/TypeBadge';
import { LoadingBlock } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { timeAgo } from '../lib/utils';

export function DecksPage() {
  const { data: decks, isLoading } = useDecks();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Your decks"
        subtitle="Build, tune, and grade your creations."
        actions={
          <button type="button" className="pd-btn-primary" onClick={() => setCreating(true)}>
            ＋ New deck
          </button>
        }
      />

      {creating && <CreateDeckForm onClose={() => setCreating(false)} />}

      {isLoading ? (
        <LoadingBlock label="Loading decks…" />
      ) : !decks || decks.length === 0 ? (
        <EmptyState
          emoji="🃏"
          title="No decks yet"
          description="Create your first deck and start building toward 60 cards."
          action={
            <button type="button" className="pd-btn-primary" onClick={() => setCreating(true)}>
              Create a deck
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckCard({ deck }: { deck: DeckDTO }) {
  const del = useDeleteDeck();
  const complete = deck.cardCount >= STANDARD_DECK_SIZE;

  return (
    <div className="pd-card group relative overflow-hidden p-5 transition-transform duration-200 ease-spring hover:-translate-y-1">
      <Link to={`/app/decks/${deck.id}`} className="flex items-center gap-4">
        <ProgressRing value={deck.cardCount} max={STANDARD_DECK_SIZE} size={92} stroke={10} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-extrabold">{deck.name}</h3>
          <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted">
            {deck.format}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(deck.primaryTypes ?? []).slice(0, 3).map((t) => (
              <TypeBadge key={t} type={t} size="sm" />
            ))}
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">Updated {timeAgo(deck.updatedAt)}</span>
        <div className="flex items-center gap-2">
          {complete && (
            <span className="pd-chip bg-green-500/15 px-2 py-0.5 text-[11px] text-green-600 dark:text-green-400">
              ✓ Legal
            </span>
          )}
          <button
            type="button"
            aria-label={`Delete ${deck.name}`}
            onClick={() => {
              if (confirm(`Delete “${deck.name}”? This can’t be undone.`)) del.mutate(deck.id);
            }}
            disabled={del.isPending}
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateDeckForm({ onClose }: { onClose: () => void }) {
  const create = useCreateDeck();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<DeckFormat>('standard');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, format },
      {
        onSuccess: (deck) => {
          onClose();
          navigate(`/app/decks/${deck.id}`);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="pd-card mb-6 space-y-3 p-5">
      <h2 className="font-display text-lg font-extrabold">Name your new deck</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          autoFocus
          className="pd-input"
          placeholder="e.g. Charizard Blaze"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          aria-label="Deck format"
          className="pd-input sm:w-48"
          value={format}
          onChange={(e) => setFormat(e.target.value as DeckFormat)}
        >
          {DECK_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      {create.isError && (
        <p className="text-sm font-semibold text-brand">Couldn’t create the deck. Try again.</p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="pd-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="pd-btn-primary" disabled={create.isPending || !name.trim()}>
          {create.isPending ? 'Creating…' : 'Create deck'}
        </button>
      </div>
    </form>
  );
}
