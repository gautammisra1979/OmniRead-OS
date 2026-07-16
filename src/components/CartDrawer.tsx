import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getCart,
  removeFromCart,
  clearCart,
  getCartTotal,
  type CartState,
} from "~/data/cart";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout?: () => void;
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const [cart, setCart] = useState<CartState>({ items: [], lastActivity: "", isAbandoned: false, abandonedAt: null, recoveryCoupon: null, recoveryDiscount: null, recoveryOffered: false, recoveryRedeemed: false });
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      setCart(getCart());
    }
  }, [open]);

  const handleRemove = useCallback(
    (productId: string) => {
      const updated = removeFromCart(productId);
      setCart(updated);
    },
    [],
  );

  const handleClear = useCallback(() => {
    const updated = clearCart();
    setCart(updated);
  }, []);

  const handleCheckout = useCallback(() => {
    onCheckout?.();
    onClose();
  }, [onCheckout, onClose]);

  const total = getCartTotal();

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm transform border-l transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          backgroundColor: "var(--color-surface,#1e293b)",
          borderColor: "var(--color-border,#334155)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t("cart.title")}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--color-border,#334155)" }}
        >
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("cart.title")}
            <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              ({cart.items.length})
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted,#94a3b8)" }}
            aria-label={t("cart.close")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl" aria-hidden="true">🛒</span>
              <p className="mt-3 text-sm font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>
                {t("cart.empty")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("cart.emptyHint")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3" role="list" aria-label="Cart items">
              {cart.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start gap-3 rounded-lg border p-3"
                  style={{
                    borderColor: "var(--color-border,#334155)",
                    backgroundColor: "var(--color-bg,#0f172a)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                    style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }}
                    aria-hidden="true"
                  >
                    {item.type === "ebook" ? "📖" : item.type === "audiobook" ? "🎧" : "🎬"}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                      {item.title}
                    </p>
                    <p className="truncate text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {item.author}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                        ${item.price.toFixed(2)}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        x{item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    className="shrink-0 rounded p-1 transition-colors hover:opacity-80"
                    style={{ color: "var(--color-text-muted,#94a3b8)" }}
                    aria-label={t("cart.remove").replace("{title}", item.title)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 border-t px-4 py-4"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {t("cart.total")}
              </span>
              <span className="text-lg font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                ${total.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: "var(--color-border,#334155)",
                  color: "var(--color-text-muted,#94a3b8)",
                }}
                aria-label={t("cart.clear")}
              >
                {t("cart.clear")}
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                aria-label={t("cart.checkout")}
              >
                {t("cart.checkout")}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}