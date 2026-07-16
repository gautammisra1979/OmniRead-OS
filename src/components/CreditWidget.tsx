import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getWallet, addCredits, getCostPer1K } from "~/data/wallet";

const REFILL_AMOUNT = 100;

export function CreditWidget() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(getWallet().credits);
  const [costPer1K, setCostPer1K] = useState(getCostPer1K());

  useEffect(() => {
    const handler = () => {
      setCredits(getWallet().credits);
      setCostPer1K(getCostPer1K());
    };
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, []);

  const handleRefill = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      addCredits(REFILL_AMOUNT);
      setLoading(false);
    }, 1500);
  }, []);

  const wallet = getWallet();

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: "var(--color-border,#334155)",
        backgroundColor: "var(--color-surface,#1e293b)/30",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {t("chat.credits").replace("{balance}", "")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            {credits}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {t("chat.refillPrice").replace("${price}", String(wallet.refillPrice))}
          </p>
          <button
            type="button"
            onClick={handleRefill}
            disabled={loading}
            className="mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("chat.refilling")}
              </span>
            ) : (
              t("chat.refillTitle")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}