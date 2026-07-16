import { useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";

const DEV_RESET_KEYS = [
  "omnimedos_catalog",
  "omnimedos_cart",
  "omnimedos_downloads",
  "omnimedos_progress",
  "omnimedos_reviews",
  "omnimedos_affiliate",
  "omnimedos_affiliate_clicks",
  "omnimedos_affiliate_ledger",
  "omnimedos_chat_history",
  "omnimedos_wallet",
  "omnimedos_knowledge_base",
  "omnimedos_comments",
  "omnimedos_media_progress",
  "omnimedos_loyalty_config",
  "omnimedos_loyalty_config_draft",
  "omnimedos_loyalty_ledger",
  "omnimedos_loyalty_points",
  "omnimedos_promotions",
  "omnimeda_license_keypair",
  "omnimeda_licenses",
  "omnimeda_activations",
  "omnimeda_activated_features",
  "omnimedia_refund_claims",
  "omnimedia_stripe_transactions",
  "omnimedos_branding",
  "omnimedos_theme",
  "omnimedia_promo_dismissed",
  "omnimedia_privacy_notice_dismissed",
];

export function PlatformFactoryReset() {
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = () => {
    setPurging(true);
    // Remove all dev/test keys from localStorage
    for (const key of DEV_RESET_KEYS) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
    // Also remove any omnimedia/omnimedos/omnimeda keys
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
    for (const k of allKeys) {
      if (k.startsWith("omnimeda") || k.startsWith("omnimedos") || k.startsWith("omnimedia")) {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      }
    }
    setTimeout(() => {
      setPurging(false);
      setDone(true);
    }, 800);
  };

  if (done) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 50%, transparent)" }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, #10b981 20%, transparent)" }} aria-hidden="true">
            <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("checkout.factoryResetDone")}</h3>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.factoryResetReload")}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {t("checkout.reloadPage")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 50%, transparent)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, #f59e0b 20%, transparent)" }} aria-hidden="true">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("checkout.factoryResetTitle")}</h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.factoryResetDesc")}</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("checkout.factoryResetDetail")}
          </p>
        </div>

        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
            style={{ borderColor: "#f59e0b", color: "#fbbf24", backgroundColor: "color-mix(in srgb, #f59e0b 10%, transparent)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            {t("checkout.factoryResetBtn")}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-xs" style={{ borderColor: "#f59e0b", backgroundColor: "color-mix(in srgb, #f59e0b 10%, transparent)", color: "#fbbf24" }} role="alert">
              {t("checkout.factoryResetConfirm")}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleReset} disabled={purging}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-40"
                style={{ backgroundColor: "#f59e0b" }}>
                {purging ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                    Resetting...
                  </span>
                ) : t("checkout.factoryResetConfirmBtn")}
              </button>
              <button type="button" onClick={() => setShowConfirm(false)} disabled={purging}
                className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}>
                {t("checkout.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}