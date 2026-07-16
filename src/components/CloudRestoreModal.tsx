import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  isCloudNewer,
  downloadFromCloud,
  isTokenValid,
} from "~/data/cloudSync";
import { importBackup } from "~/data/storageBackup";

export function CloudRestoreModal() {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [cloudTimestamp, setCloudTimestamp] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkCloud = async () => {
      if (!isTokenValid()) return;

      try {
        const newer = await isCloudNewer();
        if (newer) {
          const meta = await downloadFromCloud();
          if (meta) {
            setCloudTimestamp(meta.exportedAt);
            // Delay showing the modal to let the page load first
            setTimeout(() => setShowModal(true), 2000);
          }
        }
      } catch {
        // Silently fail — cloud restore is optional
      }
    };

    checkCloud();
  }, []);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const backup = await downloadFromCloud();
      if (!backup) {
        setToast({ message: t("cloud.restoreError"), type: "error" });
        setTimeout(() => setToast(null), 4000);
        setRestoring(false);
        return;
      }
      const jsonContent = JSON.stringify(backup);
      const result = await importBackup(jsonContent);
      if (result.success) {
        setToast({
          message: t("cloud.restoreSuccess").replace("{count}", String(result.restoredKeys)),
          type: "success",
        });
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.reload();
        }, 1500);
      } else {
        setToast({ message: result.error ?? t("cloud.restoreError"), type: "error" });
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast({ message: t("cloud.restoreError"), type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setRestoring(false);
      setShowModal(false);
    }
  }, [t]);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleDismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cloud-restore-heading"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{
              borderColor: "var(--color-border, #334155)",
              backgroundColor: "var(--color-surface, #1e293b)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)" }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  style={{ color: "var(--color-primary, #6366f1)" }}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 id="cloud-restore-heading" className="text-base font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
                  {t("cloud.restoreTitle")}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                  {t("cloud.restoreSubtitle")}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-text, #f8fafc)" }}>
              {cloudTimestamp
                ? t("cloud.restorePrompt").replace("{timestamp}", new Date(cloudTimestamp).toLocaleString())
                : t("cloud.restorePrompt").replace("{timestamp}", t("cloud.unknown"))}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoring}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
                aria-label={t("cloud.restoreConfirm")}
              >
                {restoring ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("cloud.restoring")}
                  </span>
                ) : (
                  t("cloud.restoreConfirm")
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={restoring}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                style={{
                  borderColor: "var(--color-border, #334155)",
                  color: "var(--color-text, #f8fafc)",
                }}
                aria-label={t("common.cancel")}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all"
          style={{
            backgroundColor: toast.type === "success" ? "var(--color-primary, #6366f1)" : "#ef4444",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}