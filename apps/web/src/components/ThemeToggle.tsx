import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="pd-btn relative h-10 w-10 rounded-full border border-border bg-surface text-lg
        hover:bg-surface-2"
    >
      <span
        className="transition-transform duration-500 ease-spring"
        style={{ transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)' }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
