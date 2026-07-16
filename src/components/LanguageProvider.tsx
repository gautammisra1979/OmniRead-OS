import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { translations, type Locale } from "~/data/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("omnimeda_locale");
    if (saved && (saved === "en" || saved === "es" || saved === "fr")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("omnimeda_locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const localeStrings = translations[locale];
      if (localeStrings && localeStrings[key] !== undefined) {
        return localeStrings[key];
      }
      // Fallback to English
      const enStrings = translations.en;
      return enStrings?.[key] ?? key;
    },
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}