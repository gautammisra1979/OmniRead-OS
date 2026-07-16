import { useState, useEffect } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { completeCheckout } from "~/data/stripeCheckout";

export const Route = createFileRoute("/checkout-success")({
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { t } = useLanguage();
  const search = useSearch({ from: "/checkout-success" });
  const sessionId = (search as any).session_id as string | undefined;
  const [processed, setProcessed] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (sessionId && !processed) {
      const added = completeCheckout(sessionId);
      setCount(added);
      setProcessed(true);
    }
  }, [sessionId, processed]);

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg, #0f172a)" }}>
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <div
          className="animate-fade-in rounded-xl border p-8 text-center shadow-lg"
          style={{
            borderColor: "var(--color-border, #334155)",
            backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
          }}
        >
          {/* Success Checkmark */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, #10b981 20%, transparent)" }}
            aria-hidden="true"
          >
            <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
            {t("checkout.successTitle")}
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
            {t("checkout.successDesc")}
          </p>

          {processed && (
            <div
              className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, #10b981 15%, transparent)",
                color: "#34d399",
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {count > 0
                ? t("checkout.itemsAdded").replace("{count}", String(count))
                : t("checkout.alreadyProcessed")}
            </div>
          )}

          {!sessionId && (
            <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("checkout.noSession")}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/downloads"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t("checkout.viewDownloads")}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--color-border, #334155)", color: "var(--color-text-muted, #94a3b8)" }}
            >
              {t("checkout.continueShopping")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}