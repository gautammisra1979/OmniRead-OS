import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import {
  importLicenseToken,
  getLicenses,
  seedDemoLicense,
  hasKeyPair,
  getKeyPair,
  type License,
} from "~/data/licensing";
import { dispatchLicenseChange } from "~/components/LicenseGate";

export const Route = createFileRoute("/activate")({
  component: ActivatePage,
});

function ActivatePage() {
  const { t } = useLanguage();
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [activating, setActivating] = useState(false);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh licenses list
  const refresh = useCallback(() => {
    setLicenses(getLicenses());
    setRefreshKey((k) => k + 1);
  }, []);

  // Initial load
  useState(() => {
    setLicenses(getLicenses());
  });

  // Refresh when status changes
  useCallback(() => {
    refresh();
  }, [refreshKey]);

  const handleActivate = useCallback(async () => {
    const key = licenseKey.trim();
    if (!key) {
      setStatus({ type: "error", message: t("license.keyRequired") });
      return;
    }

    setActivating(true);
    setStatus(null);

    try {
      const result = await importLicenseToken(key);
      if (result.success) {
        setStatus({ type: "success", message: result.message });
        setLicenseKey("");
        dispatchLicenseChange();
        refresh();
      } else {
        setStatus({ type: "error", message: result.message });
      }
    } catch {
      setStatus({
        type: "error",
        message: t("license.activationError"),
      });
    } finally {
      setActivating(false);
    }
  }, [licenseKey, t, refresh]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setActivating(true);
      setStatus(null);
      try {
        const text = await file.text();
        const key = text.trim();
        if (!key) {
          setStatus({ type: "error", message: t("license.keyRequired") });
          return;
        }
        const result = await importLicenseToken(key);
        if (result.success) {
          setStatus({ type: "success", message: result.message });
          dispatchLicenseChange();
          refresh();
        } else {
          setStatus({ type: "error", message: result.message });
        }
      } catch {
        setStatus({
          type: "error",
          message: t("license.activationError"),
        });
      } finally {
        setActivating(false);
      }
    },
    [t, refresh]
  );

  const handleSeedDemo = useCallback(async () => {
    // Ensure key pair exists
    if (!hasKeyPair()) {
      setStatus({ type: "info", message: t("license.generatingKeys") });
      return;
    }

    setActivating(true);
    setStatus(null);

    try {
      await seedDemoLicense();
      setStatus({
        type: "success",
        message: t("license.demoSeeded"),
      });
      dispatchLicenseChange();
      refresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: t("license.activationError"),
      });
    } finally {
      setActivating(false);
    }
  }, [t, refresh]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div
      className="min-h-screen pb-16"
      style={{ backgroundColor: "var(--color-bg, #0f172a)" }}
    >
      <div
        className="border-b"
        style={{
          borderColor: "var(--color-border, #334155)",
          backgroundColor:
            "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg shadow-sm"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              aria-hidden="true"
            >
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--color-text, #f8fafc)" }}
              >
                {t("license.pageTitle")}
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {t("license.pageSubtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Activation Form */}
        <div
          className="mb-8 rounded-xl border p-6"
          style={{
            borderColor: "var(--color-border, #334155)",
            backgroundColor:
              "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
          }}
        >
          <h2
            className="mb-1 text-base font-semibold"
            style={{ color: "var(--color-text, #f8fafc)" }}
          >
            {t("license.enterKey")}
          </h2>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--color-text-muted, #94a3b8)" }}
          >
            {t("license.enterKeyDesc")}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="license-key-input"
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {t("license.licenseKey")}
              </label>
              <textarea
                id="license-key-input"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder={t("license.keyPlaceholder")}
                rows={3}
                className="w-full rounded-lg border px-4 py-3 text-sm font-mono"
                style={{
                  backgroundColor: "var(--color-bg, #0f172a)",
                  color: "var(--color-text, #f8fafc)",
                  borderColor: "var(--color-border, #334155)",
                }}
                aria-label={t("license.licenseKey")}
              />
            </div>
            <button
              type="button"
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="flex h-[42px] items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              aria-label={t("license.activate")}
            >
              {activating ? (
                <>
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    aria-hidden="true"
                  />
                  {t("license.activating")}
                </>
              ) : (
                <>
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
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t("license.activate")}
                </>
              )}
            </button>
          </div>

          {/* Upload alternative */}
          <div className="mt-4">
            <p
              className="mb-2 text-xs"
              style={{ color: "var(--color-text-muted, #94a3b8)" }}
            >
              {t("license.orUpload")}
            </p>
            <div
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-4 py-3 transition-colors hover:border-[var(--color-primary,#6366f1)]"
              style={{
                borderColor: "var(--color-border, #334155)",
                backgroundColor:
                  "color-mix(in srgb, var(--color-surface, #1e293b) 30%, transparent)",
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={t("license.uploadKey")}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".lic,.key,.txt"
                className="hidden"
                aria-hidden="true"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              <svg
                className="mr-2 h-5 w-5"
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
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span
                className="text-sm"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {t("license.uploadKey")}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                status.type === "success"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : status.type === "error"
                  ? "bg-red-900/30 text-red-400"
                  : "bg-blue-900/30 text-blue-400"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2">
                {status.type === "success" && (
                  <svg
                    className="h-4 w-4 flex-shrink-0"
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
                )}
                {status.type === "error" && (
                  <svg
                    className="h-4 w-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                )}
                <span>{status.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Active Licenses */}
        <div
          className="rounded-xl border p-6"
          style={{
            borderColor: "var(--color-border, #334155)",
            backgroundColor:
              "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--color-text, #f8fafc)" }}
              >
                {t("license.activeLicenses")}
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {licenses.length}{" "}
                {licenses.length === 1
                  ? t("license.license")
                  : t("license.licenses")}{" "}
                {t("license.registered")}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="rounded-lg p-2 transition-colors hover:opacity-80"
              style={{ color: "var(--color-text-muted, #94a3b8)" }}
              aria-label={t("license.refresh")}
            >
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
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
            </button>
          </div>

          {licenses.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-3 text-4xl" aria-hidden="true">
                🔑
              </div>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {t("license.noLicenses")}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--color-text-muted, #94a3b8)" }}
              >
                {t("license.noLicensesHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {licenses.map((lic) => (
                <div
                  key={lic.id}
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: "var(--color-border, #334155)",
                    backgroundColor: "var(--color-bg, #0f172a)",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            lic.revoked || isExpired(lic.expiresAt)
                              ? "bg-red-900/30 text-red-400"
                              : "bg-emerald-900/30 text-emerald-400"
                          }`}
                        >
                          {lic.revoked
                            ? t("license.revoked")
                            : isExpired(lic.expiresAt)
                            ? t("license.expired")
                            : t("license.active")}
                        </span>
                        <span
                          className="rounded bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-400 uppercase"
                          aria-label={`${t("license.type")}: ${lic.type}`}
                        >
                          {lic.type}
                        </span>
                      </div>
                      <p
                        className="mt-1 text-sm font-semibold"
                        style={{ color: "var(--color-text, #f8fafc)" }}
                      >
                        {lic.holder}
                      </p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--color-text-muted, #94a3b8)" }}
                      >
                        {t("license.issued")}: {formatDate(lic.issuedAt)} |{" "}
                        {t("license.expires")}: {formatDate(lic.expiresAt)} |{" "}
                        {lic.features.includes("all")
                          ? t("license.allFeatures")
                          : lic.features.join(", ")}
                      </p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--color-text-muted, #94a3b8)" }}
                      >
                        {t("license.activations")}: {lic.maxActivations} |{" "}
                        {t("license.id")}: {lic.id.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}