import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // No web fetches allowed — a bold, friendly, rounded system stack.
        display: [
          'ui-rounded',
          '"SF Pro Rounded"',
          '"Segoe UI"',
          '"Nunito"',
          'system-ui',
          'sans-serif',
        ],
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Surface tokens driven by CSS variables (see index.css) so dark/light "just works".
        bg: 'rgb(var(--pd-bg) / <alpha-value>)',
        surface: 'rgb(var(--pd-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--pd-surface-2) / <alpha-value>)',
        border: 'rgb(var(--pd-border) / <alpha-value>)',
        ink: 'rgb(var(--pd-ink) / <alpha-value>)',
        muted: 'rgb(var(--pd-muted) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--pd-brand) / <alpha-value>)',
          soft: 'rgb(var(--pd-brand-soft) / <alpha-value>)',
        },
        accent: 'rgb(var(--pd-accent) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 4px 20px -4px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.08)',
        pop: '0 12px 40px -8px rgb(0 0 0 / 0.28)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'spring-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
        'gauge-sweep': {
          from: { strokeDashoffset: 'var(--sweep-from)' },
          to: { strokeDashoffset: 'var(--sweep-to)' },
        },
      },
      animation: {
        'spring-in': 'spring-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        float: 'float 4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
