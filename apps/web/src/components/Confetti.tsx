import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#ef5350', '#f8d030', '#6890f0', '#78c850', '#f85888', '#7038f8'];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rounded: boolean;
}

/** Lightweight CSS confetti burst — no external assets. Fires once when `fire` is true. */
export function Confetti({ fire, count = 90 }: { fire: boolean; count?: number }) {
  const [active, setActive] = useState(false);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length] ?? '#ef5350',
        size: 7 + Math.random() * 8,
        rounded: Math.random() > 0.5,
      })),
    [count],
  );

  useEffect(() => {
    if (!fire) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 4200);
    return () => clearTimeout(t);
  }, [fire]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: '-5vh',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.rounded ? '9999px' : '2px',
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.2,0.6,0.4,1) forwards`,
          }}
        />
      ))}
    </div>
  );
}
