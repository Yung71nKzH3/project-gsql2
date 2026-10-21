'use client';

import React, { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  mounted: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const emptySubscribe = () => () => {};

function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('urlbase-theme-change', callback);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('urlbase-theme-change', callback);
    media.removeEventListener('change', callback);
  };
}

function getThemeSnapshot(): Theme {
  try {
    const saved = localStorage.getItem('urlbase_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return 'light';
}

function getServerThemeSnapshot(): Theme {
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Safe hydration check using useSyncExternalStore
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Synchronize theme with storage and system preference
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  // Synchronize DOM classes when theme or mounted state changes
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const current = getThemeSnapshot();
    const next = current === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('urlbase_theme', next);
      window.dispatchEvent(new Event('urlbase-theme-change'));
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
