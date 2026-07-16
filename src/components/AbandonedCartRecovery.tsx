import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getPromoSettings, savePromoSettings } from "~/data/promotions";
import {
  getCart,
  checkCartAbandoned,
  redeemRecoveryCoupon,
  dismissRecovery,
  getRecoveryCouponCode,
  getRecoveryDiscountPercent,
  type CartState,
} from "~/data/cart";

interface AbandonedCartRecoveryProps {
  onOpenCart: () => void;
}

export function AbandonedCartRecovery({ onOpenCart }: AbandonedCartRecoveryProps) {
  const [show, setShow] = useState(false);
  const [cart, setCart] = useState<CartState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLanguage();

  // Check for abandoned cart on mount and periodically
  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      if (dismissed) return;
      const checkedCart = checkCartAbandoned();
      if (checkedCart.isAbandoned && checkedCart.recoveryOffered && !checkedCart.recoveryRedeemed) {
        setCart(checkedCart);
        setShow(true);
      }
    };

    // Check on mount
    const timer = setTimeout(check, 1000);

    // Also check every 60 seconds
    const interval = setInterval(check, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [dismissed]);

  const handleRedeem = useCallback(() => {
    // Inject into the Promotions module so checkout prices reflect the discount
    const promoSettings = getPromoSettings();
    savePromoSettings({
      ...promoSettings,
      isPromoModuleEnabled: true,
      globalDiscountType: "coupon",
      activeCouponCode: couponCode || "WELCOME_BACK",
      globalDiscountValue: discountPercent || 15,
    });
    const updated = redeemRecoveryCoupon();
    setCart(updated);
    setShow(false);
    onOpenCart();
  }, [onOpenCart, couponCode, discountPercent]);

  const handleDismiss = useCallback(() => {
    dismissRecovery();
    setShow(false);
    setDismissed(true);
  }, []);

  if (!show || !cart || cart.items.length === 0) return null;

  const couponCode = getRecoveryCouponCode();
  const discountPercent = getRecoveryDiscountPercent();

  return (
    <div
      className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border p-5 shadow-2xl"
      style={{
        borderColor: "var(--color-primary,#6366f1)",
        backgroundColor: "var(--color-surface,#1e293b)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      }}
      role="alert"
      aria-live="assertive"
      aria-label={t("recovery.title")}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded p-1 transition-colors hover:opacity-80"
        style={{ color: "var(--color-text-muted,#94a3b8)" }}
        aria-label={t("recovery.dismiss")}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Icon */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }}
          aria-hidden="true"
        >
          🛒
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("recovery.title")}
          </h3>
          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("recovery.subtitle")}
          </p>
        </div>
      </div>

      {/* Cart items summary */}
      <div className="mt-3 space-y-1.5">
        {cart.items.slice(0, 3).map((item) => (
          <div key={item.productId} className="flex items-center gap-2 text-xs">
            <span style={{ color: "var(--color-text-muted,#94a3b8)" }} aria-hidden="true">
              {item.type === "ebook" ? "📖" : item.type === "audiobook" ? "🎧" : "🎬"}
            </span>
            <span className="truncate flex-1" style={{ color: "var(--color-text,#f8fafc)" }}>
              {item.title}
            </span>
            <span className="font-semibold" style={{ color: "var(--color-primary,#6366f1)" }}>
              ${item.price.toFixed(2)}
            </span>
          </div>
        ))}
        {cart.items.length > 3 && (
          <p className="text-[10px] text-center" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            +{cart.items.length - 3} more item(s)
          </p>
        )}
      </div>

      {/* Recovery incentive */}
      {couponCode && discountPercent && (
        <div
          className="mt-3 rounded-lg border p-3 text-center"
          style={{
            borderColor: "color-mix(in srgb, var(--color-primary,#6366f1) 30%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 10%, transparent)",
          }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
            {t("recovery.incentive").replace("{discount}", String(discountPercent))}
          </p>
          <div
            className="mt-1 inline-block rounded-md px-3 py-1 font-mono text-sm font-bold tracking-wider"
            style={{
              backgroundColor: "var(--color-bg,#0f172a)",
              color: "var(--color-primary,#6366f1)",
            }}
          >
            {couponCode}
          </div>
          <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("recovery.autoApplied")}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--color-border,#334155)",
            color: "var(--color-text-muted,#94a3b8)",
          }}
          aria-label={t("recovery.dismiss")}
        >
          {t("recovery.notNow")}
        </button>
        <button
          type="button"
          onClick={handleRedeem}
          className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          aria-label={t("recovery.redeem")}
        >
          {t("recovery.redeem")}
        </button>
      </div>
    </div>
  );
}