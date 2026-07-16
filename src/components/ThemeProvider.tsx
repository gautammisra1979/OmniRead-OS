import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { presetThemes, defaultTheme, type Theme } from "~/data/themes";

interface ThemeContextType {
  theme: Theme;
  applyTheme: (theme: Theme) => void;
  presetThemesList: Theme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyThemeVars(theme: Theme) {
  const root = document.documentElement;
  const { colors } = theme;
  root.style.setProperty("--color-bg", colors.bg);
  root.style.setProperty("--color-surface", colors.surface);
  root.style.setProperty("--color-nav", colors.nav);
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-text", colors.text);
  root.style.setProperty("--color-text-muted", colors.textMuted);
  root.style.setProperty("--color-border", colors.border);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const saved = localStorage.getItem("omnimeda_theme");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Theme;
        return parsed;
      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  const applyTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("omnimeda_theme", JSON.stringify(newTheme));
    }
    applyThemeVars(newTheme);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, applyTheme, presetThemesList: presetThemes }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}