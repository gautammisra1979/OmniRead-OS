import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { presetThemes, saveStoreTheme, type Theme } from "~/data/themes";

interface ThemeContextType {
  theme: Theme;
  previewTheme: (theme: Theme) => void;
  saveTheme: (theme: Theme) => Promise<void>;
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

// Server-rendered copy of the variables so the store theme is correct on
// first paint, before any effect runs.
function themeCss(theme: Theme): string {
  const { colors } = theme;
  return `:root{--color-bg:${colors.bg};--color-surface:${colors.surface};--color-nav:${colors.nav};--color-primary:${colors.primary};--color-text:${colors.text};--color-text-muted:${colors.textMuted};--color-border:${colors.border}}`;
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Live preview: state + CSS variables, no write.
  const previewTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeVars(newTheme);
  }, []);

  // Persist, then adopt the theme the server actually stored.
  const saveTheme = useCallback(async (newTheme: Theme) => {
    const stored = await saveStoreTheme({ data: newTheme });
    setTheme(stored);
    applyThemeVars(stored);
  }, []);

  // Apply theme on mount
  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, previewTheme, saveTheme, presetThemesList: presetThemes }}
    >
      <style dangerouslySetInnerHTML={{ __html: themeCss(initialTheme) }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
