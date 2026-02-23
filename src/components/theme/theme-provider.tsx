"use client";

import * as React from "react";

type Theme = "light" | "dark";
type ThemeMode = Theme | "system";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: Theme;
  isHydrated: boolean;
  setTheme: (nextTheme: ThemeMode) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "theme";

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyResolvedTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>("light");
  const [resolvedTheme, setResolvedTheme] = React.useState<Theme>("light");
  const [isHydrated, setIsHydrated] = React.useState(false);

  const setTheme = React.useCallback((nextTheme: ThemeMode) => {
    if (nextTheme === "system") {
      const systemTheme = getSystemTheme();
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      setThemeState("system");
      setResolvedTheme(systemTheme);
      applyResolvedTheme(systemTheme);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
    setResolvedTheme(nextTheme);
    applyResolvedTheme(nextTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
      setResolvedTheme(storedTheme);
      applyResolvedTheme(storedTheme);
      setIsHydrated(true);
      return;
    }

    const systemTheme = getSystemTheme();
    setThemeState("system");
    setResolvedTheme(systemTheme);
    applyResolvedTheme(systemTheme);
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      const nextTheme = event.matches ? "dark" : "light";
      setResolvedTheme(nextTheme);
      applyResolvedTheme(nextTheme);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      isHydrated,
      setTheme,
      toggleTheme
    }),
    [theme, resolvedTheme, isHydrated, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}

