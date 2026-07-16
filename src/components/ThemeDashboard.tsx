import { useState } from "react";
import { useTheme } from "~/components/ThemeProvider";
import { useLanguage } from "~/components/LanguageProvider";
import { type Theme } from "~/data/themes";

const colorKeys: { key: keyof Theme["colors"]; labelKey: string }[] = [
  { key: "bg", labelKey: "admin.theme.background" },
  { key: "surface", labelKey: "admin.theme.surface" },
  { key: "nav", labelKey: "admin.theme.nav" },
  { key: "primary", labelKey: "admin.theme.primary" },
  { key: "text", labelKey: "admin.theme.text" },
  { key: "textMuted", labelKey: "admin.theme.muted" },
  { key: "border", labelKey: "admin.theme.border" },
];

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function ThemeDashboard() {
  const { theme, applyTheme, presetThemesList } = useTheme();
  const { t } = useLanguage();
  const [customColors, setCustomColors] = useState<Theme["colors"] | null>(null);

  const activeColors = customColors ?? theme.colors;

  const handlePresetClick = (preset: Theme) => {
    setCustomColors(null);
    applyTheme(preset);
  };

  const handleCustomColorChange = (key: keyof Theme["colors"], value: string) => {
    setCustomColors((prev) => ({
      ...(prev ?? theme.colors),
      [key]: value,
    }));
    // Apply immediately if valid hex
    if (HEX_REGEX.test(value)) {
      const newTheme: Theme = {
        ...theme,
        colors: { ...(customColors ?? theme.colors), [key]: value },
      };
      applyTheme(newTheme);
    }
  };

  const handleReset = () => {
    setCustomColors(null);
    applyTheme(presetThemesList[0]);
  };

  return (
    <div className="mt-12 border-t border-[var(--color-border,#334155)] pt-10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text,#f8fafc)]">
          {t("admin.theme.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.theme.desc")}
        </p>
      </div>

      {/* Preset swatches */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {presetThemesList.map((preset) => {
          const isActive = theme.id === preset.id && !customColors;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
                  : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/50 hover:border-[var(--color-text-muted,#94a3b8)]"
              }`}
              aria-label={`Apply ${preset.name} theme`}
            >
              {/* Color dots */}
              <div className="flex gap-1">
                {(["bg", "surface", "nav", "primary", "text", "textMuted", "border"] as const).map(
                  (k) => (
                    <span
                      key={k}
                      className="h-5 w-5 rounded border border-[var(--color-border,#334155)]"
                      style={{ backgroundColor: preset.colors[k] }}
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
              <span className="text-sm font-medium text-[var(--color-text,#f8fafc)]">
                {preset.name}
              </span>
              {isActive && (
                <span className="text-xs font-medium text-[var(--color-primary,#6366f1)]">
                  {t("status.active")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom hex inputs */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {colorKeys.map(({ key, labelKey }) => (
          <div
            key={key}
            className="rounded-xl border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30 p-4"
          >
            <label
              htmlFor={`theme-${key}`}
              className="block text-xs font-medium text-[var(--color-text-muted,#94a3b8)] uppercase tracking-wider"
            >
              {t(labelKey)}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-[var(--color-border,#334155)]"
                style={{ backgroundColor: activeColors[key] }}
                aria-hidden="true"
              />
              <input
                id={`theme-${key}`}
                type="text"
                value={activeColors[key]}
                onChange={(e) => handleCustomColorChange(key, e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-3 py-1.5 text-sm font-mono text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Reset button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-[var(--color-border,#334155)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted,#94a3b8)] transition-colors hover:bg-[var(--color-surface,#1e293b)] hover:text-[var(--color-text,#f8fafc)]"
        >
          {t("admin.theme.reset")}
        </button>
      </div>
    </div>
  );
}