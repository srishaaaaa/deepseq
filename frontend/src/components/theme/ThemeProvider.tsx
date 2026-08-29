"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

/** localStorage key. Kept in sync with the inline no-FOUC script in
 * app/layout.tsx and with the account-level `theme` in user_settings
 * (settings page writes both on save). */
export const THEME_STORAGE_KEY = 'deepseq-theme';

function readStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* SSR / privacy mode — fall through */
  }
  return 'dark';
}

/** Applies the theme to <html> so the CSS token overrides in globals.css
 * (`:root[data-theme="light"] { ... }`) take effect, and updates
 * `color-scheme` so native form controls / scrollbars follow. */
export function applyTheme(theme: Theme) {
  const el = document.documentElement;
  el.setAttribute('data-theme', theme);
  el.style.colorScheme = theme;
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Hydrate from whatever the pre-paint inline script already applied.
  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* ignore persistence failure */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
