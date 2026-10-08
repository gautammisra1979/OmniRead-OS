import { translations, type Locale } from "~/data/translations";

/** Server-safe counterpart to LanguageProvider's t(): no React, same lookup and English fallback. */
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "es", "fr"];

export function resolveLocale(value: unknown): Locale {
  return SUPPORTED_LOCALES.find((locale) => locale === value) ?? "en";
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const template = translations[locale]?.[key] ?? translations.en?.[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}
