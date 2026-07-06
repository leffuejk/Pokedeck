import type { ReactNode } from 'react';

export function EmptyState({
  emoji = '✨',
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="pd-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">
        {emoji}
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
