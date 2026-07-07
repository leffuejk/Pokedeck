import { useState } from 'react';
import type { ReactNode } from 'react';
import type { CardDTO } from '@pokedeck/shared';
import { typesGradient } from '../lib/typeColors';
import { cn } from '../lib/utils';
import { TypeBadge } from './TypeBadge';

interface CardTileProps {
  card: CardDTO;
  /** Owned quantity badge (optional). */
  owned?: number;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function CardTile({ card, owned, footer, onClick, className }: CardTileProps) {
  const image = card.smallImageUrl ?? card.largeImageUrl ?? null;

  return (
    <div
      className={cn(
        'group pd-card overflow-hidden transition-all duration-200 ease-spring',
        'hover:-translate-y-1 hover:shadow-pop',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <div className="relative aspect-[63/88] w-full overflow-hidden bg-surface-2">
        <CardImage card={card} image={image} />
        {owned != null && owned > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-extrabold text-white shadow-soft">
            ×{owned}
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-sm font-extrabold" title={card.name}>
            {card.name}
          </h3>
          {card.hp != null && (
            <span className="shrink-0 text-[11px] font-bold text-muted">{card.hp} HP</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="pd-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
            {card.supertype}
          </span>
          {(card.types?.length ?? 0) > 0
            ? (card.types ?? []).map((t) => <TypeBadge key={t} type={t} size="sm" />)
            : <TypeBadge type={card.supertype} size="sm" />
          }
        </div>
        {footer && <div className="pt-1">{footer}</div>}
      </div>
    </div>
  );
}

/** Card artwork with a graceful, on-theme placeholder when no image is available. */
function CardImage({ card, image }: { card: CardDTO; image: string | null }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={card.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 ease-spring group-hover:scale-105"
      />
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center"
      style={{ background: typesGradient(card.types) }}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/85 text-2xl shadow-soft">
        {card.supertype === 'Energy' ? '⚡' : card.supertype === 'Trainer' ? '🎒' : '🃏'}
      </div>
      <span className="line-clamp-2 text-xs font-bold text-white drop-shadow">{card.name}</span>
    </div>
  );
}
