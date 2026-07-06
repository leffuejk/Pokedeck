import type { DeckScoreBreakdown } from '@pokedeck/shared';
import { clamp } from '../lib/utils';

interface Axis {
  key: keyof DeckScoreBreakdown;
  label: string;
}

const AXES: Axis[] = [
  { key: 'consistency', label: 'Consistency' },
  { key: 'energyBalance', label: 'Energy' },
  { key: 'typeCoverage', label: 'Coverage' },
  { key: 'speed', label: 'Speed' },
  { key: 'resilience', label: 'Resilience' },
  { key: 'techFlexibility', label: 'Tech' },
];

interface StatRadarProps {
  scores: DeckScoreBreakdown;
  size?: number;
  /** Max value each axis can hold (scores assumed 0–100). */
  maxValue?: number;
}

/** Hexagonal radar chart for the 6 score axes, drawn as inline SVG. */
export function StatRadar({ scores, size = 300, maxValue = 100 }: StatRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 44;
  const n = AXES.length;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i: number, r: number) => {
    const a = angleFor(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const gridPolys = rings.map((ring) =>
    AXES.map((_, i) => pointFor(i, radius * ring).join(',')).join(' '),
  );

  const valuePoints = AXES.map((axis, i) => {
    const raw = clamp(scores[axis.key] ?? 0, 0, maxValue) / maxValue;
    return pointFor(i, radius * raw);
  });
  const valuePolygon = valuePoints.map((p) => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Deck score radar">
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--pd-brand))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--pd-accent))" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      {/* grid rings */}
      {gridPolys.map((pts, idx) => (
        <polygon
          key={idx}
          points={pts}
          fill="none"
          stroke="rgb(var(--pd-border))"
          strokeWidth={1}
        />
      ))}

      {/* spokes */}
      {AXES.map((_, i) => {
        const [x, y] = pointFor(i, radius);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--pd-border))" strokeWidth={1} />;
      })}

      {/* value polygon */}
      <polygon
        points={valuePolygon}
        fill="url(#radar-fill)"
        stroke="rgb(var(--pd-brand))"
        strokeWidth={2.5}
        strokeLinejoin="round"
        style={{ transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
      {valuePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="rgb(var(--pd-brand))" />
      ))}

      {/* labels */}
      {AXES.map((axis, i) => {
        const [x, y] = pointFor(i, radius + 24);
        const value = Math.round(clamp(scores[axis.key] ?? 0, 0, maxValue));
        return (
          <text
            key={axis.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink"
            fontSize={11}
            fontWeight={700}
          >
            <tspan x={x} dy="-0.3em">
              {axis.label}
            </tspan>
            <tspan x={x} dy="1.2em" className="fill-muted" fontSize={10}>
              {value}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
