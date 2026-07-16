import { useState, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getCurrentPoints } from "~/data/loyalty";
import { submitRefundClaim } from "~/data/refunds";

interface RefundFormProps {
  downloadId: string;
  productId: string;
  productTitle: string;
  transactionId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function RefundForm({ downloadId, productId, productTitle, transactionId, onClose, onSubmitted }: RefundFormProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loyaltyPoints = getCurrentPoints();

  const handleSubmit = useCallback(() => {
    if (!reason.trim()) return;
    setSubmitting(true);
    // Simulate async submission
    setTimeout(() => {
      submitRefundClaim({
        downloadId,
        productId,
        productTitle,
        transactionId,
        reason: reason.trim(),
        refundLoyaltyPoints: loyaltyPoints,
      });
      setSubmitted(true);
      setSubmitting(false);
    }, 800);
  }, [reason, downloadId, productId, productTitle, transactionId, loyaltyPoints]);

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Refund submitted">
        <div className="animate-fade-in w-full max-w-md rounded-xl border p-6 shadow-lg" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }} aria-hidden="true">
              <svg className="h-7 w-7" style={{ color: "var(--color-primary,#6366f1)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("checkout.refundSubmitted")}</h3>
            <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.refundPendingNote")}</p>
            <button type="button" onClick={onSubmitted} className="mt-5 rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110" style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>
              {t("checkout.close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={t("checkout.requestRefund")}>
      <div className="animate-fade-in w-full max-w-md rounded-xl border p-6 shadow-lg" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("checkout.requestRefund")}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 transition-colors hover:opacity-80" aria-label={t("checkout.close")} style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product info */}
        <p className="mb-4 text-sm font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>
          {productTitle}
        </p>
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("checkout.transactionId")}: {transactionId.slice(0, 16)}...
        </p>

        {/* Reason */}
        <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("checkout.refundReason")}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
          placeholder={t("checkout.refundReasonPlaceholder")}
          aria-label={t("checkout.refundReason")}
        />

        {/* Points notice */}
        {loyaltyPoints > 0 && (
          <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("checkout.refundPointsNotice").replace("{points}", String(loyaltyPoints))}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}
          >
            {t("checkout.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="flex-1 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
            style={{ backgroundColor: "#ef4444" }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                {t("checkout.submitting")}
              </span>
            ) : t("checkout.submitRefund")}
          </button>
        </div>
      </div>
    </div>
  );
}