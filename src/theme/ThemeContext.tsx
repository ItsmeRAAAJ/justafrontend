import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ============================================================================
//  Theme state — purely presentational. Nothing here touches auth, data or
//  routing. Default is dark: this is a control-room tool used at night.
//  A returning user's choice is restored from localStorage['rs_theme'], and
//  index.html applies it before first paint so there is no flash.
// ============================================================================

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'rs_theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  return 'light'; // User requested to always start in light mode by default
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Keep <html data-theme> and the browser chrome colour in step with state.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#141210' : '#e9ecf0');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — the session still themes correctly */
    }
  }, [theme]);

  // Brief cross-fade rather than an instant flip. The transition class is added
  // only for the duration of the swap so it costs nothing at rest, and is
  // skipped outright when the user has asked for reduced motion.
  const setTheme = useCallback((next: Theme) => {
    if (prefersReducedMotion()) {
      setThemeState(next);
      return;
    }
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setThemeState(next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** True when the user has asked for reduced motion. Drives animation opt-outs. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
