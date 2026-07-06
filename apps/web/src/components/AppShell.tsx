import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMe } from '../hooks/useMe';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { Mascot } from './Mascot';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/collection', label: 'Collection', icon: '🗂️' },
  { to: '/app/decks', label: 'Decks', icon: '🃏' },
  { to: '/app/coach', label: 'Coach', icon: '🎓' },
];

export function AppShell() {
  const { data: user } = useMe();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <NavLink to="/app" className="flex items-center gap-2">
            <Mascot size={36} animated={false} />
            <span className="font-display text-lg font-black tracking-tight">Pokedeck</span>
          </NavLink>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 sm:flex">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? 'You'}
                  className="h-9 w-9 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {(user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <a href="/api/auth/signout" className="pd-btn-ghost hidden text-sm sm:inline-flex">
              Sign out
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors',
                  isActive ? 'text-brand' : 'text-muted',
                )
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all duration-150 ease-spring',
          isActive ? 'bg-brand text-white shadow-soft' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      <span aria-hidden>{item.icon}</span>
      {item.label}
    </NavLink>
  );
}

/** A simple centered page section wrapper used across pages. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
