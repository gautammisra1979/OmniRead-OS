/**
 * PrivacyNoticeBanner — Non-intrusive bottom privacy notice for new visitors.
 * Displays once per session explaining local browser storage usage.
 * Dismissible, ARIA-compliant, CSS-variable themed.
 */

import { useState, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { Link } from "@tanstack/react-router";

const DISMISSED_KEY = "omnimedia_privacy_notice_dismissed";

export function PrivacyNoticeBanner() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === "true";
    if (!dismissed) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 shadow-lg"
      style={{
        backgroundColor: "var(--color-surface, #1e293b)",
        borderColor: "var(--color-border, #334155)",
      }}
      role="alert"
      aria-live="polite"
      aria-label="Privacy notice"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent)" }}
            aria-hidden="true"
          >
            <svg
              className="h-4 w-4"
              style={{ color: "var(--color-primary, #6366f1)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-3.75h.008v.008H12V6zm0 12h.008v.008H12V18z"
              />
            </svg>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
            {t("privacy.notice")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/legal"
            className="rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors hover:opacity-80"
            style={{
              color: "var(--color-primary, #6366f1)",
              backgroundColor: "color-mix(in srgb, var(--color-primary, #6366f1) 10%, transparent)",
            }}
          >
            {t("privacy.learnMore")}
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
            aria-label={t("privacy.dismiss")}
          >
            {t("privacy.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}