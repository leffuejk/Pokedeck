import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 0,
  max = 99,
  onChange,
  disabled = false,
  busy = false,
  className,
}: QuantityStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1',
        busy && 'opacity-60',
        className,
      )}
    >
      <StepButton label="Decrease" onClick={dec} disabled={disabled || busy || value <= min}>
        −
      </StepButton>
      <span
        className="min-w-8 text-center font-display text-sm font-extrabold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <StepButton label="Increase" onClick={inc} disabled={disabled || busy || value >= max}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-base font-bold
        leading-none transition-transform duration-150 ease-spring hover:bg-brand hover:text-white
        active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-2
        disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}
