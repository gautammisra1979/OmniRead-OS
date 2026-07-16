import { useEffect, useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  checkAndRecover,
  setupCleanExitHandler,
} from "~/data/flightRecorder";

export function FlightRecorderBoot() {
  const { t } = useLanguage();
  const [recoveryToast, setRecoveryToast] = useState<{
    message: string;
    recovered: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set up the clean exit handler (beforeunload listener)
    setupCleanExitHandler();

    // Check for crash recovery
    const result = checkAndRecover();

    if (result.recovered) {
      setRecoveryToast({
        message: t("flightRecorder.recovered"),
        recovered: true,
      });
    } else {
      // Always show a "ready" state on clean boot
      setRecoveryToast({
        message: t("flightRecorder.ready"),
        recovered: false,
      });
    }

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => setRecoveryToast(null), 4000);
    return () => clearTimeout(timer);
  }, [t]);

  if (!recoveryToast) return null;

  return (
    <div
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all duration-500"
      style={{
        backgroundColor: recoveryToast.recovered
          ? "var(--color-primary, #6366f1)"
          : "color-mix(in srgb, var(--color-primary) 60%, transparent)",
      }}
      role="status"
      aria-live="polite"
      aria-label={
        recoveryToast.recovered
          ? t("flightRecorder.recovered")
          : t("flightRecorder.ready")
      }
    >
      <div className="flex items-center gap-2">
        {recoveryToast.recovered ? (
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
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        )}
        <span>{recoveryToast.message}</span>
      </div>
    </div>
  );
}