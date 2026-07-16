/**
 * LicenseGate — Route protection component for premium features.
 *
 * Wraps premium content and checks if the feature is unlocked.
 * Shows an activation/upgrade prompt when access is denied.
 * Fully responsive, ARIA-compliant, CSS-variable themed.
 */

import { useState, useEffect, type ReactNode } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { isFeatureUnlocked, resetFeatureCache } from "~/data/licensing";

interface LicenseGateProps {
  feature: string;
  featureName: string;
  featureIcon: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function LicenseGate({
  feature,
  featureName,
  featureIcon,
  children,
  fallback,
}: LicenseGateProps) {
  const { t } = useLanguage();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Re-check on mount
    setUnlocked(isFeatureUnlocked(feature));
    setChecking(false);
  }, [feature]);

  // Listen for license changes (e.g. after activation)
  useEffect(() => {
    const handleLicenseChange = () => {
      resetFeatureCache();
      setUnlocked(isFeatureUnlocked(feature));
    };
    window.addEventListener("omnimedia_license_changed", handleLicenseChange);
    return () => {
      window.removeEventListener(
        "omnimedia_license_changed",
        handleLicenseChange
      );
    };
  }, [feature]);

  if (checking) {
    return (
      <div
        className="flex min-h-[300px] items-center justify-center"
        aria-busy="true"
        role="status"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{
            borderColor: "var(--color-border, #334155)",
            borderTopColor: "var(--color-primary, #6366f1)",
          }}
          aria-hidden="true"
        />
        <span className="sr-only">Checking license...</span>
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  // If a custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <div
      className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8"
      role="region"
      aria-label={t("license.gateLabel").replace("{feature}", featureName)}
    >
      <div
        className="rounded-xl border p-8 text-center shadow-lg"
        style={{
          backgroundColor: "var(--color-surface, #1e293b)",
          borderColor: "var(--color-border, #334155)",
        }}
      >
        {/* Lock Icon */}
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)",
          }}
          aria-hidden="true"
        >
          <svg
            className="h-8 w-8"
            style={{ color: "var(--color-primary, #6366f1)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Feature Icon */}
        <div className="mb-2 text-4xl" aria-hidden="true">
          {featureIcon}
        </div>

        {/* Title */}
        <h2
          className="mb-2 text-xl font-bold"
          style={{ color: "var(--color-text, #f8fafc)" }}
        >
          {t("license.locked").replace("{feature}", featureName)}
        </h2>

        {/* Description */}
        <p
          className="mb-6 text-sm leading-relaxed"
          style={{ color: "var(--color-text-muted, #94a3b8)" }}
        >
          {t("license.lockedDesc")
            .replace("{feature}", featureName)
            .replace("{featureIcon}", featureIcon)}
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/activate"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
            aria-label={t("license.activateCta").replace("{feature}", featureName)}
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("license.activateCta").replace("{feature}", featureName)}
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--color-border, #334155)",
              color: "var(--color-text-muted, #94a3b8)",
            }}
          >
            {t("license.browseProducts")}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Dispatch a custom event to notify LicenseGate components to re-check.
 */
export function dispatchLicenseChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("omnimedia_license_changed"));
}