import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getReminderInterval,
  saveReminderInterval,
  getPacingConfig,
  getProgressEntries,
} from "~/data/progress";

const INTERVAL_OPTIONS = [1, 2, 3, 4, 5];

export function NotificationSettings() {
  const { t } = useLanguage();
  const [interval, setIntervalState] = useState(getReminderInterval);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    saveReminderInterval(interval);
  }, [interval]);

  const compileMessage = useCallback((): string => {
    const config = getPacingConfig();
    const entries = getProgressEntries();
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    const bookTitle = lastEntry?.productTitle ?? "your book";
    const pacing = config?.dailyTarget?.toString() ?? "some";
    const status = lastEntry
      ? `${lastEntry.completedUnits} of ${lastEntry.totalUnits} units completed`
      : "just getting started";
    return `📚 Reading Reminder: You're reading "${bookTitle}" with a target of ${pacing} units/day. Progress: ${status}. Keep going! 📖`;
  }, []);

  const handleSendReminder = useCallback(async () => {
    const msg = compileMessage();

    // Try Web Share API first (mobile SMS)
    if (navigator.share) {
      try {
        await navigator.share({ text: msg });
        setCopied(t("challenge.reminderCopied"));
        setTimeout(() => setCopied(""), 3000);
        return;
      } catch { /* user cancelled or not available */ }
    }

    // Try clipboard + SMS fallback
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(t("challenge.reminderCopied"));
      setTimeout(() => setCopied(""), 3000);
    } catch {
      // Clipboard failed
    }

    // Try SMS protocol on mobile
    const smsUrl = `sms:?body=${encodeURIComponent(msg)}`;
    window.open(smsUrl, "_blank");

    // Fallback: Web Push Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📚 Reading Reminder", { body: msg });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification("📚 Reading Reminder", { body: msg });
        }
      });
    }
  }, [compileMessage, t]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "var(--color-border,#334155)",
        backgroundColor: "var(--color-surface,#1e293b)/30",
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
        {t("challenge.notifTitle")}
      </h3>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {t("challenge.notifDesc")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t("challenge.notifTitle")}>
        {INTERVAL_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={interval === days}
            onClick={() => setIntervalState(days)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              interval === days
                ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10 text-[var(--color-primary,#6366f1)]"
                : "border-[var(--color-border,#334155)] text-[var(--color-text-muted,#94a3b8)] hover:border-[var(--color-primary,#6366f1)]/50"
            }`}
          >
            {t("challenge.notifEvery").replace("{days}", String(days))}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSendReminder}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
        >
          {t("challenge.sendReminder")}
        </button>
        {copied && (
          <span
            className="text-xs font-medium animate-pulse"
            style={{ color: "var(--color-primary,#6366f1)" }}
            role="status"
            aria-live="polite"
          >
            {copied}
          </span>
        )}
      </div>
    </div>
  );
}