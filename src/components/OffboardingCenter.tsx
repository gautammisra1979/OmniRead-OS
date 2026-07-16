/**
 * OffboardingCenter — Admin section for data export and right-to-be-forgotten purge.
 * Collects all client-side data (catalog, activity, analytics) into a downloadable JSON backup.
 * Full purge clears all localStorage and sessionStorage matching OmniMedia keys.
 * Anti-piracy filters applied via SecurityShield.
 */

import { useState, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getCatalogItems } from "~/data/catalog";
import { getProgressEntries, getReviews } from "~/data/progress";
import { getDownloads } from "~/data/downloads";
import { getChatHistory } from "~/data/chatHistory";
import { getLicenses } from "~/data/licensing";
import { getUnlockedFeatures } from "~/data/licensing";

/* ─── Data Export Engine ─── */

interface ExportPayload {
  exportedAt: string;
  source: string;
  catalog: ReturnType<typeof getCatalogItems>;
  progress: ReturnType<typeof getProgressEntries>;
  reviews: ReturnType<typeof getReviews>;
  downloads: ReturnType<typeof getDownloads>;
  chatHistory: ReturnType<typeof getChatHistory>;
  licenses: ReturnType<typeof getLicenses>;
  unlockedFeatures: string[];
  userPreferences: Record<string, string | null>;
}

function collectAllData(): ExportPayload {
  const prefs: Record<string, string | null> = {};
  if (typeof window !== "undefined") {
    const keys = [
      "omnimeda_locale",
      "omnimeda_device_id",
      "omnimeda_admin_auth",
      "omnimedos_catalog",
      "omnimedos_cart",
      "omnimedos_progress",
      "omnimedos_reviews",
      "omnimedos_downloads",
      "omnimedos_chat_history",
      "omnimedos_wallet",
      "omnimedos_knowledge_base",
      "omnimedos_affiliate",
      "omnimedos_affiliate_clicks",
      "omnimedos_affiliate_ledger",
      "omnimedos_branding",
      "omnimedos_theme",
      "omnimedos_promotions",
      "omnimedos_comments",
      "omnimedos_media_progress",
      "omnimeda_license_keypair",
      "omnimeda_licenses",
      "omnimeda_activations",
      "omnimeda_activated_features",
      "omnimedos_loyalty_config",
      "omnimedos_loyalty_points",
      "omnimedos_loyalty_ledger",
    ];
    for (const key of keys) {
      try {
        prefs[key] = localStorage.getItem(key);
      } catch {
        prefs[key] = null;
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    source: "OmniMedia OS — Offboarding Export",
    catalog: getCatalogItems(),
    progress: getProgressEntries(),
    reviews: getReviews(),
    downloads: getDownloads(),
    chatHistory: getChatHistory(),
    licenses: getLicenses(),
    unlockedFeatures: getUnlockedFeatures(),
    userPreferences: prefs,
  };
}

function downloadJson(data: ExportPayload, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Purge Engine ─── */

const OMNIMEDIA_KEY_PREFIXES = [
  "omnimeda",
  "omnimedos",
];

function isOmniMediaKey(key: string): boolean {
  return OMNIMEDIA_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function purgeAllData(): void {
  if (typeof window === "undefined") return;

  // Clear localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isOmniMediaKey(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  // Clear sessionStorage
  const sessionKeysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && isOmniMediaKey(key)) {
      sessionKeysToRemove.push(key);
    }
  }
  for (const key of sessionKeysToRemove) {
    sessionStorage.removeItem(key);
  }
}

/* ─── Component ─── */

export function OffboardingCenter() {
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);

  const handleExport = useCallback(() => {
    setExporting(true);
    setExportMsg(null);

    try {
      const data = collectAllData();
      const size = new Blob([JSON.stringify(data)]).size;
      const sizeLabel =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
          ? `${(size / 1024).toFixed(1)} KB`
          : `${(size / (1024 * 1024)).toFixed(1)} MB`;

      downloadJson(data, `omnimedia-backup-${Date.now()}.json`);
      setExportMsg(t("offboarding.exportSuccess").replace("{size}", sizeLabel));
    } catch {
      setExportMsg("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handlePurge = useCallback(() => {
    setPurging(true);
    purgeAllData();
    // Reload after a brief moment to let the state update
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  // Count data items
  const catalogCount = getCatalogItems().length;
  const progressCount = getProgressEntries().length;
  const reviewCount = getReviews().length;
  const hasData = catalogCount > 0 || progressCount > 0 || reviewCount > 0;

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: "var(--color-border, #334155)",
          backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)" }}
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              style={{ color: "var(--color-primary, #6366f1)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
              {t("offboarding.title")}
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("offboarding.desc")}
            </p>
          </div>
        </div>

        {/* Data Summary */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div
            className="rounded-lg border p-3 text-center"
            style={{ borderColor: "var(--color-border, #334155)", backgroundColor: "var(--color-bg, #0f172a)" }}
          >
            <p className="text-lg font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
              {catalogCount}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("offboarding.dataCatalog")}
            </p>
          </div>
          <div
            className="rounded-lg border p-3 text-center"
            style={{ borderColor: "var(--color-border, #334155)", backgroundColor: "var(--color-bg, #0f172a)" }}
          >
            <p className="text-lg font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
              {progressCount}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("offboarding.dataActivity")}
            </p>
          </div>
          <div
            className="rounded-lg border p-3 text-center"
            style={{ borderColor: "var(--color-border, #334155)", backgroundColor: "var(--color-bg, #0f172a)" }}
          >
            <p className="text-lg font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
              {reviewCount}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("offboarding.dataAnalytics")}
            </p>
          </div>
        </div>

        {/* Export Section */}
        <div
          className="mb-4 rounded-lg border p-4"
          style={{ borderColor: "var(--color-border, #334155)", backgroundColor: "var(--color-bg, #0f172a)" }}
        >
          <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
            {t("offboarding.exportTitle")}
          </h3>
          <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
            {t("offboarding.exportDesc")}
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
            aria-label={t("offboarding.exportBtn")}
          >
            {exporting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t("offboarding.exportBtn")}
              </>
            )}
          </button>
          {exportMsg && (
            <p className="mt-2 text-xs text-emerald-400" role="status" aria-live="polite">
              {exportMsg}
            </p>
          )}
          {!hasData && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("offboarding.noData")}
            </p>
          )}
        </div>

        {/* Purge Section */}
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--color-border, #334155)", backgroundColor: "var(--color-bg, #0f172a)" }}
        >
          <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
            {t("offboarding.purgeTitle")}
          </h3>
          <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
            {t("offboarding.purgeDesc")}
          </p>

          {!showPurgeConfirm ? (
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
              style={{
                borderColor: "#ef4444",
                color: "#ef4444",
                backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
              }}
              aria-label={t("offboarding.purgeBtn")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t("offboarding.purgeBtn")}
            </button>
          ) : (
            <div className="space-y-3">
              <div
                className="rounded-lg border p-3 text-xs"
                style={{
                  borderColor: "#ef4444",
                  backgroundColor: "color-mix(in srgb, #ef4444 10%, transparent)",
                  color: "#fca5a5",
                }}
                role="alert"
              >
                {t("offboarding.purgeConfirm")}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={purging}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ backgroundColor: "#ef4444" }}
                  aria-label={t("offboarding.purgeConfirmBtn")}
                >
                  {purging ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Purging...
                    </span>
                  ) : t("offboarding.purgeConfirmBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  disabled={purging}
                  className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: "var(--color-border, #334155)", color: "var(--color-text-muted, #94a3b8)" }}
                >
                  {t("offboarding.purgeCancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}