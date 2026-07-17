import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getAnnouncementConfig, type AnnouncementConfig } from "~/data/stylePresets";

const ANNOUNCEMENT_STYLES: Record<AnnouncementConfig["type"], { bg: string; text: string; icon: string }> = {
  info: { bg: "var(--color-primary,#6366f1)", text: "#ffffff", icon: "ℹ️" },
  sale: { bg: "#dc2626", text: "#ffffff", icon: "🏷️" },
  shipping: { bg: "#059669", text: "#ffffff", icon: "🚚" },
  warning: { bg: "#d97706", text: "#ffffff", icon: "⚠️" },
};

export function AnnouncementBar() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AnnouncementConfig>(getAnnouncementConfig());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => {
      setConfig(getAnnouncementConfig());
      setDismissed(false);
    };
    window.addEventListener("announcement-changed", handler);
    return () => window.removeEventListener("announcement-changed", handler);
  }, []);

  // Check if dismissed in session
  useEffect(() => {
    if (typeof window !== "undefined" && config.dismissible) {
      const val = sessionStorage.getItem("omnimedos_announcement_dismissed");
      if (val === "true") setDismissed(true);
    }
  }, [config.dismissible]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("omnimedos_announcement_dismissed", "true");
    }
  }, []);

  if (!config.enabled || dismissed) return null;

  const style = ANNOUNCEMENT_STYLES[config.type];
  const shippingMsg = config.shippingMessage.replace("{threshold}", `$${config.shippingThreshold}`);

  return (
    <div
      role="banner"
      aria-live="polite"
      className="relative w-full px-4 py-2.5 text-center text-sm font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="mr-2" aria-hidden="true">{style.icon}</span>
      <span>{config.type === "shipping" ? shippingMsg : config.text}</span>
      {config.linkUrl && (
        <a
          href={config.linkUrl}
          className="ml-2 underline underline-offset-2 hover:opacity-80"
          style={{ color: style.text }}
        >
          {config.linkText}
        </a>
      )}
      {config.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-white/20"
          aria-label={t("common.close") ?? "Dismiss"}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}