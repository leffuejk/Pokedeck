import { clamp } from '../lib/utils';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** Ring color; defaults to the brand color. */
  color?: string;
  label?: string;
  sublabel?: string;
}

/** A circular progress ring, e.g. deck size toward STANDARD_DECK_SIZE. */
export function ProgressRing({
  value,
  max,
  size = 120,
  stroke = 12,
  color = 'rgb(var(--pd-brand))',
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clamp(max === 0 ? 0 : value / max, 0, 1);
  const offset = circumference * (1 - pct);
  const complete = value >= max;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--pd-surface-2))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? 'rgb(var(--pd-brand))' : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-2xl font-extrabold tabular-nums leading-none">
            {label ?? `${value}/${max}`}
          </div>
          {sublabel && <div className="mt-1 text-[11px] font-semibold text-muted">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}
