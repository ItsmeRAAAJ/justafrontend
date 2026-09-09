/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS custom property from src/theme/tokens.css, so no
// component ever branches on the active theme — swapping data-theme on <html> is
// the whole mechanism. Opacity shorthands (bg-surface/60) are intentionally not
// used on themed colours; explicit tint tokens (accent-soft, red-fill, line-soft)
// exist for that purpose so both themes stay hand-tuned rather than derived.

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--rs-bg)',
        'bg-alt': 'var(--rs-bg-alt)',
        surface: 'var(--rs-surface)',
        'surface-2': 'var(--rs-surface-2)',
        'surface-3': 'var(--rs-surface-3)',
        line: 'var(--rs-line)',
        'line-strong': 'var(--rs-line-strong)',
        'line-soft': 'var(--rs-line-soft)',

        ink: 'var(--rs-text)',
        muted: 'var(--rs-text-muted)',
        dim: 'var(--rs-text-dim)',
        'on-accent': 'var(--rs-on-accent)',

        // Brass — railway hardware. The one accent family shared by both themes.
        brass: {
          DEFAULT: 'var(--rs-accent)',
          strong: 'var(--rs-accent-strong)',
          soft: 'var(--rs-accent-soft)',
          line: 'var(--rs-accent-line)',
        },

        // Signal aspects. red = conflict/rejected, amber = pending/caution,
        // green = approved/clear. Same meaning in both themes.
        signal: {
          red: 'var(--rs-red)',
          'red-text': 'var(--rs-red-text)',
          'red-fill': 'var(--rs-red-fill)',
          'red-line': 'var(--rs-red-line)',
          amber: 'var(--rs-amber)',
          'amber-text': 'var(--rs-amber-text)',
          'amber-fill': 'var(--rs-amber-fill)',
          'amber-line': 'var(--rs-amber-line)',
          green: 'var(--rs-green)',
          'green-text': 'var(--rs-green-text)',
          'green-fill': 'var(--rs-green-fill)',
          'green-line': 'var(--rs-green-line)',
        },

        rail: {
          DEFAULT: 'var(--rs-rail)',
          strong: 'var(--rs-rail-strong)',
        },
      },
      fontFamily: {
        // Barlow Condensed: public-transit signage grotesque — station name
        // boards, coach-position boards, departure indicators.
        display: ['"Barlow Condensed"', 'Oswald', 'Impact', 'sans-serif'],
        // IBM Plex Sans: institutional and engineered, with a Devanagari
        // companion — Indian Railways signage is bilingual.
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Squarer than a typical dashboard: forms, panels and plates are square.
        sm: '3px',
        DEFAULT: '4px',
        md: '5px',
        lg: '6px',
        xl: '10px',
      },
      boxShadow: {
        panel: 'var(--rs-shadow-panel)',
        raised: 'var(--rs-shadow-raised)',
        inset: 'var(--rs-inset)',
        paper: 'var(--rs-paper-edge)',
      },
      transitionTimingFunction: {
        signal: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        'lamp-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.55', filter: 'brightness(1.35)' },
        },
        'rail-sweep': {
          from: { strokeDashoffset: 'var(--sweep-from, 240)' },
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'lamp-pulse': 'lamp-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
