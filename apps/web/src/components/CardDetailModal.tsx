import { useEffect, useState } from 'react';
import type { CardDTO } from '@pokedeck/shared';
import { useCardDetail } from '../hooks/useCardDetail';
import { TypeBadge } from './TypeBadge';
import { Spinner } from './Spinner';
import { typesGradient } from '../lib/typeColors';
import { cn } from '../lib/utils';

interface CardDetailModalProps {
  cardId: string;
  card: CardDTO;
  owned?: number;
  onClose: () => void;
  /** true when opened on top of another modal — uses higher z-index, skips body-overflow management */
  stacked?: boolean;
}

export function CardDetailModal({ cardId, card, owned, onClose, stacked = false }: CardDetailModalProps) {
  const { data: detail, isLoading, isError } = useCardDetail(cardId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    // Capture phase so this fires before any parent-modal bubble-phase listeners
    document.addEventListener('keydown', onKey, { capture: true });
    if (!stacked) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, { capture: true });
      if (!stacked) document.body.style.overflow = '';
    };
  }, [onClose, stacked]);

  const image = detail?.largeImageUrl ?? card.largeImageUrl ?? detail?.smallImageUrl ?? card.smallImageUrl;

  return (
    <div
      className={cn(
        'fixed inset-0 overflow-y-auto bg-ink/60 backdrop-blur-sm',
        stacked ? 'z-[60]' : 'z-50',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto my-8 max-w-2xl px-4 pb-8">
        <div className="pd-card p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">{card.name}</h2>
              {card.hp != null && (
                <span className="text-sm font-bold text-muted">{card.hp} HP</span>
              )}
            </div>
            <button
              className="pd-btn-ghost shrink-0 px-3 py-1.5 text-sm"
              onClick={onClose}
              aria-label="Close card details"
            >
              ✕ Close
            </button>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Image + owned count */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
              <CardArt card={card} image={image} />
              {owned !== undefined && owned > 0 && (
                <div className="rounded-full border border-brand/30 bg-brand-soft/60 px-4 py-1.5 text-sm font-bold text-brand">
                  You own {owned}
                </div>
              )}
              {owned === 0 && (
                <div className="rounded-full border border-border bg-surface-2 px-4 py-1.5 text-sm font-bold text-muted">
                  Not in collection
                </div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 space-y-4">
              {/* Types / Supertype / Subtypes */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="pd-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                  {card.supertype}
                </span>
                {(card.subtypes ?? []).map((s) => (
                  <span key={s} className="pd-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                    {s}
                  </span>
                ))}
                {(card.types ?? []).map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                {card.regulationMark && (
                  <span className="pd-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                    Mark {card.regulationMark}
                  </span>
                )}
                {card.rarity && (
                  <span className="pd-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                    {card.rarity}
                  </span>
                )}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner size={16} /> Loading details…
                </div>
              )}

              {isError && !detail && (
                <p className="text-sm italic text-muted">Full details unavailable.</p>
              )}

              {detail && (
                <>
                  {/* Evolution chain */}
                  {(detail.evolvesFrom || (detail.evolvesTo?.length ?? 0) > 0) && (
                    <div className="space-y-1 text-sm">
                      {detail.evolvesFrom && (
                        <div className="text-muted">
                          Evolves from <span className="font-bold text-ink">{detail.evolvesFrom}</span>
                        </div>
                      )}
                      {(detail.evolvesTo?.length ?? 0) > 0 && (
                        <div className="text-muted">
                          Evolves into <span className="font-bold text-ink">{detail.evolvesTo!.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Abilities */}
                  {(detail.abilities?.length ?? 0) > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
                        Abilities
                      </h3>
                      <div className="space-y-2">
                        {detail.abilities!.map((ability, i) => (
                          <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="pd-chip border border-brand/30 bg-brand-soft/60 px-2 py-0.5 text-[11px] font-bold text-brand">
                                {ability.type}
                              </span>
                              <span className="font-bold">{ability.name}</span>
                            </div>
                            <p className="text-sm text-muted">{ability.text}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Attacks */}
                  {(detail.attacks?.length ?? 0) > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
                        Attacks
                      </h3>
                      <div className="space-y-2">
                        {detail.attacks!.map((attack, i) => (
                          <div key={i} className="rounded-xl border border-border bg-surface-2 p-3">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              {(attack.cost ?? []).map((c, ci) => (
                                <TypeBadge key={ci} type={c} size="sm" />
                              ))}
                              <span className="font-bold">{attack.name}</span>
                              {attack.damage && (
                                <span className="ml-auto shrink-0 font-display font-extrabold text-brand">
                                  {attack.damage}
                                </span>
                              )}
                            </div>
                            {attack.text && (
                              <p className="text-sm text-muted">{attack.text}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Weakness / Resistance / Retreat */}
                  {((detail.weaknesses?.length ?? 0) > 0 ||
                    (detail.resistances?.length ?? 0) > 0 ||
                    (detail.retreatCost?.length ?? 0) > 0) && (
                    <section>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
                        Combat Stats
                      </h3>
                      <div className="flex flex-wrap gap-5 text-sm">
                        {(detail.weaknesses?.length ?? 0) > 0 && (
                          <div>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                              Weakness
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {detail.weaknesses!.map((w, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <TypeBadge type={w.type} size="sm" />
                                  <span className="font-bold text-muted">{w.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(detail.resistances?.length ?? 0) > 0 && (
                          <div>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                              Resistance
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {detail.resistances!.map((r, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <TypeBadge type={r.type} size="sm" />
                                  <span className="font-bold text-muted">{r.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(detail.retreatCost?.length ?? 0) > 0 && (
                          <div>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                              Retreat
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {detail.retreatCost!.map((c, i) => (
                                <TypeBadge key={i} type={c} size="sm" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Flavor text */}
                  {detail.flavorText && (
                    <p className="border-l-2 border-border pl-3 text-sm italic text-muted">
                      {detail.flavorText}
                    </p>
                  )}

                  {/* Legalities */}
                  {detail.legalities && Object.keys(detail.legalities).length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-extrabold uppercase tracking-widest text-muted">
                        Legality
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(detail.legalities) as [string, string][])
                          .filter(([, status]) => Boolean(status))
                          .map(([format, status]) => (
                            <span
                              key={format}
                              className={cn(
                                'pd-chip border px-2 py-0.5 text-[11px] font-bold capitalize',
                                status === 'Legal'
                                  ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
                              )}
                            >
                              {format}: {status}
                            </span>
                          ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardArt({ card, image }: { card: CardDTO; image: string | null }) {
  const [failed, setFailed] = useState(false);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={card.name}
        onError={() => setFailed(true)}
        className="w-44 rounded-xl shadow-soft sm:w-52"
      />
    );
  }

  return (
    <div
      className="flex h-64 w-44 flex-col items-center justify-center gap-2 rounded-xl p-3 text-center sm:w-52"
      style={{ background: typesGradient(card.types) }}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/85 text-2xl shadow-soft">
        {card.supertype === 'Energy' ? '⚡' : card.supertype === 'Trainer' ? '🎒' : '🃏'}
      </div>
      <span className="text-sm font-bold text-white drop-shadow">{card.name}</span>
    </div>
  );
}
