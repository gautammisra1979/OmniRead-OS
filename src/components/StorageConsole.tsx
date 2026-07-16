import { useState, useEffect, useCallback, useRef, type DragEvent } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getLocalStorageUsageBytes,
  getLocalStorageLimit,
  getUsagePercentage,
  formatBytes,
  getPersona,
  exportBackup,
  downloadBackup,
  importBackup,
  type Persona,
} from "~/data/storageBackup";
import { CloudSyncSection } from "~/components/CloudSyncSection";

export function StorageConsole() {
  const { t } = useLanguage();
  const [usageBytes, setUsageBytes] = useState(0);
  const [usagePct, setUsagePct] = useState(0);
  const [persona, setPersona] = useState<Persona>("buyer");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
      showToast(t("storage.exportSuccess"), "success");
    } catch {
      showToast(t("storage.exportError"), "error");
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        showToast(t("storage.invalidFile"), "error");
        return;
      }
      setImporting(true);
      try {
        const content = await file.text();
        const result = await importBackup(content);
        if (result.success) {
          showToast(
            t("storage.importSuccess").replace("{count}", String(result.restoredKeys)),
            "success",
          );
          // Reload after short delay so user sees the toast
          setTimeout(() => {
            if (typeof window !== "undefined") window.location.reload();
          }, 1500);
        } else {
          showToast(result.error ?? t("storage.importError"), "error");
        }
      } catch {
        showToast(t("storage.importError"), "error");
      } finally {
        setImporting(false);
      }
    },
    [t],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

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

      {/* Export button */}
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="mb-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
        aria-label={t("storage.exportBtn")}
      >
        {exporting ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t("storage.exporting")}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {t("storage.exportBtn")}
          </span>
        )}
      </button>

      {/* Import drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors ${
          dragOver
            ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
            : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label={t("storage.importHint")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />

        {importing ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-8 w-8 animate-spin"
              style={{ color: "var(--color-primary, #6366f1)" }}
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("storage.importing")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-8 w-8"
              style={{ color: "var(--color-text-muted, #94a3b8)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
              />
            </svg>
            <span className="text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("storage.importHint")}
            </span>
          </div>
        )}
      </div>

      {/* Cloud Sync Integration */}
      <div className="mt-6 border-t border-[var(--color-border,#334155)] pt-6">
        <CloudSyncSection />
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all"
          style={{
            backgroundColor: toast.type === "success"
              ? "var(--color-primary, #6366f1)"
              : "#ef4444",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}