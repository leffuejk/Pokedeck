import { clamp } from '../lib/utils';

interface ScoreGaugeProps {
  /** Score 0–100 (null renders an "un-graded" state). */
  score: number | null;
  size?: number;
  stroke?: number;
  caption?: string;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#f8d030';
  if (score >= 30) return '#f08030';
  return '#ef5350';
}

function grade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

/** Animated semicircular score gauge with a letter grade. */
export function ScoreGauge({ score, size = 200, stroke = 16, caption }: ScoreGaugeProps) {
  const value = score == null ? 0 : clamp(score, 0, 100);
  const radius = (size - stroke) / 2;
  const cy = size / 2;
  // Semicircle: sweep from 180° to 360°.
  const semi = Math.PI * radius;
  const offset = semi * (1 - value / 100);
  const color = score == null ? 'rgb(var(--pd-muted))' : scoreColor(value);
  const height = size / 2 + stroke;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: size, height }}>
        <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke="rgb(var(--pd-surface-2))"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={semi}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
        </svg>
        <div
          className="absolute inset-x-0 flex flex-col items-center"
          style={{ bottom: 4 }}
        >
          <div className="font-display text-4xl font-black leading-none tabular-nums" style={{ color }}>
            {score == null ? '—' : Math.round(value)}
          </div>
          <div className="mt-0.5 text-xs font-bold uppercase tracking-wider text-muted">
            {score == null ? 'not graded' : `grade ${grade(value)}`}
          </div>
        </div>
      </div>
      {caption && <div className="mt-1 text-sm font-semibold text-muted">{caption}</div>}
    </div>
  );
}

export { scoreColor };
