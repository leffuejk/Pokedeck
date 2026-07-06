import { typeTheme } from '../lib/typeColors';
import { cn } from '../lib/utils';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md';
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function TypeBadge({
  type,
  size = 'md',
  interactive = false,
  selected = false,
  onClick,
  className,
}: TypeBadgeProps) {
  const theme = typeTheme(type);
  const style = selected
    ? { backgroundColor: theme.color, color: theme.on, borderColor: theme.color }
    : { backgroundColor: theme.soft, color: theme.on, borderColor: `${theme.color}55` };

  const content = (
    <>
      <span aria-hidden>{theme.glyph}</span>
      <span>{type}</span>
    </>
  );

  const classes = cn(
    'pd-chip border',
    size === 'sm' && 'px-2 py-0.5 text-[11px]',
    interactive && 'transition-transform duration-150 ease-spring hover:scale-105 active:scale-95',
    className,
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={classes} style={style} aria-pressed={selected}>
        {content}
      </button>
    );
  }
  return (
    <span className={classes} style={style}>
      {content}
    </span>
  );
}
