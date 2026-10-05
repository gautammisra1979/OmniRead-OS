import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getLocalStorageUsageBytes,
  getLocalStorageLimit,
  getUsagePercentage,
  formatBytes,
  getPersona,
  type Persona,
} from "~/data/storageBackup";

export function StorageConsole() {
  const { t } = useLanguage();
  const [usageBytes, setUsageBytes] = useState(0);
  const [usagePct, setUsagePct] = useState(0);
  const [persona, setPersona] = useState<Persona>("buyer");

  const refreshUsage = useCallback(() => {
    setUsageBytes(getLocalStorageUsageBytes());
    setUsagePct(getUsagePercentage());
    setPersona(getPersona());
  }, []);

  useEffect(() => {
    refreshUsage();
    const interval = setInterval(refreshUsage, 3000);
    return () => clearInterval(interval);
  }, [refreshUsage]);

  const limit = getLocalStorageLimit();
  const usageLabel = `${formatBytes(usageBytes)} / ${formatBytes(limit)}`;
  const barColor =
    usagePct > 90 ? "#ef4444" : usagePct > 70 ? "#f59e0b" : "var(--color-primary, #6366f1)";

  const personaDisclosure = () => {
    switch (persona) {
      case "owner":
        return t("storage.disclosureOwner");
      case "affiliate":
        return t("storage.disclosureAffiliate");
      case "buyer":
      default:
        return t("storage.disclosureBuyer");
    }
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "var(--color-border, #334155)",
        backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
        {t("storage.title")}
      </h3>
      <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
        {t("storage.subtitle")}
      </p>

      {/* Usage bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: "var(--color-text-muted, #94a3b8)" }}>{usageLabel}</span>
          <span className="font-bold" style={{ color: barColor }}>
            {usagePct}%
          </span>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-border, #334155) 50%, transparent)" }}
          role="progressbar"
          aria-valuenow={usagePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage usage: ${usagePct}%`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usagePct}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
      </div>

      {/* Persona disclosure */}
      <div
        className="mb-4 rounded-lg border p-3 text-xs leading-relaxed"
        style={{
          borderColor: "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 8%, transparent)",
        }}
        role="note"
        aria-label="Storage disclosure"
      >
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            style={{ color: "var(--color-primary, #6366f1)" }}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span style={{ color: "var(--color-text, #f8fafc)" }}>
            {personaDisclosure()}
          </span>
        </div>
      </div>
    </div>
  );
}