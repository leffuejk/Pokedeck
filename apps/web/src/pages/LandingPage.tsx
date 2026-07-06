import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { POKEMON_TYPES } from '@pokedeck/shared';
import { useMe } from '../hooks/useMe';
import { Mascot } from '../components/Mascot';
import { ThemeToggle } from '../components/ThemeToggle';
import { TypeBadge } from '../components/TypeBadge';

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Track what you own',
    body: 'Search thousands of cards and build your personal collection with a tap.',
  },
  {
    icon: '🃏',
    title: 'Build legal decks',
    body: 'A guided 60-card builder that keeps you within the rules as you go.',
  },
  {
    icon: '🎓',
    title: 'Get graded by AI',
    body: 'The Professor scores your deck across six axes and tells you exactly what to fix.',
  },
  {
    icon: '🔍',
    title: 'Find what’s missing',
    body: 'Smart suggestions surface the cards that would push your deck over the top.',
  },
];

export function LandingPage() {
  const { data: user, isLoading } = useMe();
  const navigate = useNavigate();

  // Already signed in? Head straight to the app.
  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true });
  }, [isLoading, user, navigate]);

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <Mascot size={40} animated={false} />
          <span className="font-display text-xl font-black">Pokedeck</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="/api/auth/signin" className="pd-btn-primary text-sm">
            Sign in
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
          <div className="animate-spring-in">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              AI-assisted deck building
            </div>
            <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl">
              Build your dream deck.{' '}
              <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                Let the AI Professor grade it.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Pick the cards you actually own, assemble a deck, and get an instant, honest grade with
              concrete suggestions — like having a coach in your pocket.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/api/auth/signin" className="pd-btn-primary text-base">
                Sign in to start ▶
              </a>
              <a href="#features" className="pd-btn-ghost text-base">
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-1.5">
              {POKEMON_TYPES.map((t) => (
                <TypeBadge key={t} type={t} size="sm" />
              ))}
            </div>
          </div>

          <div className="relative grid place-items-center">
            <div className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-brand/30 to-accent/30 blur-2xl" />
            <Mascot size={280} />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-8">
          <h2 className="text-center text-2xl font-black sm:text-3xl">Everything a trainer needs</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-muted">
            From collection to championship — Pokedeck guides every step.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="pd-card p-5 transition-transform duration-200 ease-spring hover:-translate-y-1"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl2 bg-brand-soft text-2xl">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="my-12">
          <div className="pd-card relative overflow-hidden bg-gradient-to-br from-brand to-accent p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-black sm:text-4xl">Ready to become a deck-building champion?</h2>
            <p className="mx-auto mt-3 max-w-md text-white/90">
              Sign in and let the Professor grade your very first deck in seconds.
            </p>
            <a
              href="/api/auth/signin"
              className="pd-btn mt-6 bg-white px-6 py-3 text-base font-extrabold text-brand hover:-translate-y-0.5 hover:shadow-pop"
            >
              Sign in free
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        Pokedeck — a fan-made deck lab. Not affiliated with Nintendo, Game Freak, or The Pokémon
        Company.
      </footer>
    </div>
  );
}
