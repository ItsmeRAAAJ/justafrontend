import { motion } from 'motion/react';
import { useTheme, useReducedMotion } from '../../theme/ThemeContext';

// ============================================================================
//  ThemeToggle — the panel lamp switch.
//
//  Framed as hardware rather than as a preference: a control desk has an
//  inspection lamp you switch on after dark and leave off while working by
//  daylight. Lamp lit → control room (dark theme). Lamp out → daylight, working
//  off the paper (light theme). No sun, no moon.
// ============================================================================

function Bulb({ lit }: { lit: boolean }) {
  const reduced = useReducedMotion();
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {/* Halo — only meaningful in the control room, so it rides --rs-glow */}
      {lit && (
        <circle
          cx="9"
          cy="7.4"
          r="7"
          fill="var(--rs-accent-strong)"
          style={{ opacity: `calc(0.28 * var(--rs-glow))` }}
        />
      )}
      {/* Glass envelope */}
      <path
        d="M9 1.6c-2.6 0-4.6 2-4.6 4.5 0 1.6.8 2.6 1.6 3.4.5.5.8 1 .8 1.7h4.4c0-.7.3-1.2.8-1.7.8-.8 1.6-1.8 1.6-3.4 0-2.5-2-4.5-4.6-4.5Z"
        fill={lit ? 'var(--rs-accent-soft)' : 'none'}
        stroke={lit ? 'var(--rs-accent-strong)' : 'var(--rs-text-muted)'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Filament — the part that actually carries the on/off reading */}
      <motion.path
        d="M7.4 6.6 9 8.4l1.6-1.8"
        fill="none"
        stroke={lit ? 'var(--rs-accent-strong)' : 'var(--rs-text-dim)'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ opacity: lit ? 1 : 0.6 }}
        transition={reduced ? { duration: 0 } : { duration: 0.25 }}
      />
      {/* Brass cap and contact */}
      <path
        d="M6.6 12.2h4.8M7.1 14.1h3.8M8 15.9h2"
        stroke={lit ? 'var(--rs-accent)' : 'var(--rs-text-muted)'}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ThemeToggleProps {
  /** `bar` fills its container (sidebar); `icon` is a compact square (login). */
  variant?: 'bar' | 'icon';
  className?: string;
}

export function ThemeToggle({ variant = 'bar', className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const reduced = useReducedMotion();
  const lit = theme === 'dark';
  const action = lit ? 'Switch to daylight theme' : 'Switch to control room theme';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={action}
        title={action}
        className={`inline-flex h-9 w-9 items-center justify-center rounded border border-line
          bg-surface transition-colors duration-150 hover:border-brass-line hover:bg-surface-2 ${className}`}
      >
        <Bulb lit={lit} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={action}
      title={action}
      className={`group flex w-full items-center gap-2.5 rounded border border-line bg-surface-3
        px-2.5 py-2 text-left transition-colors duration-150
        hover:border-brass-line hover:bg-surface-2 ${className}`}
    >
      <Bulb lit={lit} />
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[9px] font-medium uppercase leading-none tracking-[0.14em] text-dim">
          Panel Lamp
        </span>
        <span className="mt-1 block font-display text-[13px] font-semibold uppercase leading-none tracking-[0.06em] text-ink">
          {lit ? 'On' : 'Off'}
        </span>
      </span>
      {/* Rocker switch: the knuckle sits up when lit, down when out */}
      <span
        className="relative flex h-[22px] w-[13px] shrink-0 flex-col rounded-sm border p-[2px]"
        style={{ borderColor: 'var(--rs-line-strong)', background: 'var(--rs-surface-2)' }}
      >
        <motion.span
          className="block h-[8px] w-full rounded-[1px]"
          style={{ background: lit ? 'var(--rs-accent)' : 'var(--rs-line-strong)' }}
          initial={false}
          animate={{ y: lit ? 0 : 8 }}
          transition={
            reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 32 }
          }
        />
      </span>
    </button>
  );
}
