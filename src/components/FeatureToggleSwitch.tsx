import type { Module } from "~/data/features";
import { useLanguage } from "~/components/LanguageProvider";

interface FeatureToggleSwitchProps {
  module: Module;
  onToggle: (id: string) => void;
}

export function FeatureToggleSwitch({ module: feature, onToggle }: FeatureToggleSwitchProps) {
  const { t } = useLanguage();
  const isLocked = feature.locked;
  const isEnabled = feature.enabled;

  return (
    <div
      className="group flex flex-col gap-4 rounded-xl border p-5 transition-all duration-300"
      style={{
        borderColor: isLocked ? "var(--color-primary)" : isEnabled ? "var(--color-border)" : "var(--color-border)",
        backgroundColor: isLocked
          ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))"
          : "color-mix(in srgb, var(--color-surface) 50%, transparent)",
        opacity: isLocked || isEnabled ? 1 : 0.7,
      }}
      aria-label={`${feature.name}: ${isLocked ? "Core infrastructure (always active)" : isEnabled ? "Active" : "Disabled"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: isLocked
                ? "color-mix(in srgb, var(--color-primary) 20%, transparent)"
                : isEnabled
                  ? "color-mix(in srgb, #22c55e 20%, transparent)"
                  : "var(--color-surface)",
              color: isLocked ? "var(--color-primary)" : isEnabled ? "#22c55e" : "var(--color-text-muted)",
            }}
          >
            <i className={`fa-solid ${feature.icon} text-lg`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
              {feature.name}
            </h3>
          </div>
        </div>

        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider"
          style={{
            color: isLocked || isEnabled ? "#22c55e" : "#f59e0b",
            backgroundColor: isLocked || isEnabled
              ? "color-mix(in srgb, #22c55e 10%, transparent)"
              : "color-mix(in srgb, #f59e0b 10%, transparent)",
          }}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isLocked || isEnabled ? "bg-green-400" : "bg-amber-400"}`} aria-hidden="true" />
          {isLocked ? t("status.active") : isEnabled ? t("status.active") : t("status.disabled")}
        </span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {feature.description}
      </p>

      <div className="flex items-center justify-between pt-1">
        {isLocked ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <svg
              className="h-4 w-4" style={{ color: "var(--color-primary)" }}
              fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {t("admin.core.label")}
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.premium.label")}</span>
        )}

        <button
          type="button"
          role="switch"
          id={`toggle-${feature.id}`}
          aria-checked={isLocked || isEnabled}
          aria-label={`${feature.name}: ${isLocked ? "Core module (always active)" : isEnabled ? "enabled" : "disabled"}`}
          disabled={isLocked}
          onClick={() => !isLocked && onToggle(feature.id)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
          style={{
            backgroundColor: isLocked || isEnabled ? "var(--color-primary)" : "var(--color-border)",
          }}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isLocked || isEnabled ? "translate-x-5" : "translate-x-0"}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}