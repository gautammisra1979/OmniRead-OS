import { useState, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { saveAffiliateProfile, handleExists, type AffiliateProfile } from "~/data/affiliate";

interface AffiliateSetupProps {
  onComplete: () => void;
  existingProfile?: AffiliateProfile | null;
}

export function AffiliateSetup({ onComplete, existingProfile }: AffiliateSetupProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(existingProfile ? 2 : 1);
  const [brandName, setBrandName] = useState(existingProfile?.brandName ?? "");
  const [handle, setHandle] = useState(existingProfile?.handle ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "venmo" | "crypto">(
    existingProfile?.paymentMethod ?? "paypal"
  );
  const [paymentDetail, setPaymentDetail] = useState(existingProfile?.paymentDetail ?? "");
  const [handleWarning, setHandleWarning] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleRegister = useCallback(() => {
    if (!brandName.trim() || !handle.trim()) return;
    if (!existingProfile && handleExists(handle.trim())) {
      setHandleWarning(true);
      return;
    }
    setHandleWarning(false);
    const profile: AffiliateProfile = {
      handle: handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      brandName: brandName.trim(),
      registeredAt: existingProfile?.registeredAt ?? new Date().toISOString(),
      paymentMethod,
      paymentDetail,
    };
    saveAffiliateProfile(profile);
    setStep(2);
    if (existingProfile) onComplete();
  }, [brandName, handle, paymentMethod, paymentDetail, existingProfile, onComplete]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, []);

  const storefrontLink = `${window.location.origin}/?ref=${handle}`;
  const bookLink = `${window.location.origin}/?ref=${handle}&book=BOOK_ID`;

  return (
    <div
      className="mx-auto max-w-2xl"
    >
      {step === 1 && (
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.setupTitle")}
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.subtitle")}
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="aff-brand" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.brandName")}
              </label>
              <input
                id="aff-brand"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                placeholder="e.g. Jennie's Book Club"
                aria-label={t("affiliate.brandName")}
              />
            </div>

            <div>
              <label htmlFor="aff-handle" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.handle")}
              </label>
              <input
                id="aff-handle"
                type="text"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setHandleWarning(false);
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                placeholder="booktok_jennie"
                aria-label={t("affiliate.handle")}
              />
              <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.handleHint")}
              </p>
              {handleWarning && (
                <p className="mt-1 text-[10px] text-red-400" role="alert">Handle already taken. Try another.</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label htmlFor="aff-payment" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.paymentMethod")}
              </label>
              <select
                id="aff-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "paypal" | "venmo" | "crypto")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                aria-label={t("affiliate.paymentMethod")}
              >
                <option value="paypal">{t("affiliate.paypal")}</option>
                <option value="venmo">{t("affiliate.venmo")}</option>
                <option value="crypto">{t("affiliate.crypto")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="aff-payment-detail" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.paymentPlaceholder")}
              </label>
              <input
                id="aff-payment-detail"
                type="text"
                value={paymentDetail}
                onChange={(e) => setPaymentDetail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                placeholder="email@example.com"
                aria-label={t("affiliate.paymentPlaceholder")}
              />
            </div>

            <button
              type="button"
              onClick={handleRegister}
              disabled={!brandName.trim() || !handle.trim()}
              className="w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              aria-label={t("affiliate.register")}
            >
              {existingProfile ? t("affiliate.saveProfile") : t("affiliate.register")}
            </button>
          </div>
        </div>
      )}

      {step === 2 && !existingProfile && (
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.linkGenerated")}
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.subtitle")}
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.storeLink")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs font-mono" style={{ color: "var(--color-primary,#6366f1)" }}>
                  {storefrontLink}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(storefrontLink)}
                  className="shrink-0 rounded px-2 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    color: copiedLink === storefrontLink ? "#34d399" : "var(--color-text-muted,#94a3b8)",
                    backgroundColor: "var(--color-surface,#1e293b)",
                  }}
                  aria-label="Copy storefront link"
                >
                  {copiedLink === storefrontLink ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.bookLink")}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs font-mono" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {bookLink}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bookLink)}
                  className="shrink-0 rounded px-2 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    color: copiedLink === bookLink ? "#34d399" : "var(--color-text-muted,#94a3b8)",
                    backgroundColor: "var(--color-surface,#1e293b)",
                  }}
                  aria-label="Copy book link"
                >
                  {copiedLink === bookLink ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <p className="text-xs italic" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("affiliate.replaceBookId")}
            </p>

            <button
              type="button"
              onClick={onComplete}
              className="w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("affiliate.viewDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}