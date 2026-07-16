import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getSyncStatus,
  isTokenValid,
  initiateGoogleOAuth,
  connectSimulatedCloud,
  uploadToCloud,
  downloadFromCloud,
  disconnectCloud,
  getCloudScopeDisclosure,
  triggerSync,
  type SyncStatus,
} from "~/data/cloudSync";
import { importBackup } from "~/data/storageBackup";

export function CloudSyncSection() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshStatus = useCallback(() => {
    setStatus(getSyncStatus());
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleLinkGoogle = useCallback(() => {
    initiateGoogleOAuth();
  }, []);

  const handleLinkSimulated = useCallback(() => {
    connectSimulatedCloud();
    refreshStatus();
    showToast(t("cloud.connectedSimulated"), "success");
  }, [t, refreshStatus]);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const ts = await uploadToCloud();
      if (ts) {
        showToast(t("cloud.syncSuccess"), "success");
        refreshStatus();
      } else {
        showToast(t("cloud.syncError"), "error");
      }
    } catch {
      showToast(t("cloud.syncError"), "error");
    } finally {
      setSyncing(false);
    }
  }, [t, refreshStatus]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const backup = await downloadFromCloud();
      if (!backup) {
        showToast(t("cloud.restoreError"), "error");
        return;
      }
      const jsonContent = JSON.stringify(backup);
      const result = await importBackup(jsonContent);
      if (result.success) {
        showToast(t("cloud.restoreSuccess").replace("{count}", String(result.restoredKeys)), "success");
        setTimeout(() => {
          if (typeof window !== "undefined") window.location.reload();
        }, 1500);
      } else {
        showToast(result.error ?? t("cloud.restoreError"), "error");
      }
    } catch {
      showToast(t("cloud.restoreError"), "error");
    } finally {
      setRestoring(false);
    }
  }, [t]);

  const handleDisconnect = useCallback(() => {
    disconnectCloud();
    refreshStatus();
    showToast(t("cloud.disconnected"), "success");
  }, [t, refreshStatus]);

  const valid = isTokenValid();

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
        {t("cloud.title")}
      </h4>
      <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
        {t("cloud.subtitle")}
      </p>

      {/* Scope disclosure */}
      <div
        className="mb-4 rounded-lg border p-3 text-xs leading-relaxed"
        style={{
          borderColor: "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 8%, transparent)",
        }}
        role="note"
        aria-label="Cloud scope disclosure"
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span style={{ color: "var(--color-text, #f8fafc)" }}>
            {getCloudScopeDisclosure()}
          </span>
        </div>
      </div>

      {/* Connection status */}
      {valid ? (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <span className="flex h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
          <span style={{ color: "var(--color-text-muted, #94a3b8)" }}>
            {t("cloud.connected")} ({status.provider === "simulated" ? "Simulated" : "Google Drive"})
          </span>
          {status.lastSyncAt && (
            <span className="ml-2" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              — {t("cloud.lastSync")}: {new Date(status.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
      ) : (
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
          {t("cloud.notConnected")}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!valid && (
          <>
            <button
              type="button"
              onClick={handleLinkGoogle}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              aria-label={t("cloud.linkGoogle")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("cloud.linkGoogle")}
            </button>
            <button
              type="button"
              onClick={handleLinkSimulated}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: "var(--color-border, #334155)",
                color: "var(--color-text-muted, #94a3b8)",
              }}
              aria-label={t("cloud.linkSimulated")}
            >
              {t("cloud.linkSimulated")}
            </button>
          </>
        )}

        {valid && (
          <>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              aria-label={t("cloud.syncNow")}
            >
              {syncing ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.5 12.75l3-3m0 0l3 3m-3-3v6" />
                </svg>
              )}
              {syncing ? t("cloud.syncing") : t("cloud.syncNow")}
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              style={{
                borderColor: "var(--color-border, #334155)",
                color: "var(--color-text, #f8fafc)",
              }}
              aria-label={t("cloud.restore")}
            >
              {restoring ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              {restoring ? t("cloud.restoring") : t("cloud.restore")}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: "var(--color-border, #334155)",
                color: "#ef4444",
              }}
              aria-label={t("cloud.disconnect")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              {t("cloud.disconnect")}
            </button>
          </>
        )}
      </div>

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
    </div>
  );
}