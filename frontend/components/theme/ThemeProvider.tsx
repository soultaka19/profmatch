"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_THEME,
  ROLE_THEME_MAP,
  THEME_STORAGE_KEY,
  isThemeId,
} from "@/lib/theme/config";
import type { ThemeId } from "@/lib/theme/types";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  setThemeForRole: (role: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage indisponible — on garde l'état en mémoire seulement.
    }
  }, []);

  const setThemeForRole = useCallback(
    (role: string) => {
      const themeId = ROLE_THEME_MAP[role] ?? DEFAULT_THEME;
      setTheme(themeId);
    },
    [setTheme]
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, setThemeForRole }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return ctx;
}
