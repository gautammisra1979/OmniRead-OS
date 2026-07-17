import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";

export interface QuickHoverItem {
  id: string;
  title: string;
  author: string;
  price: number;
  displayPrice?: number;
  hasDiscount?: boolean;
  coverImage?: string | null;
  coverIcon?: string;
  coverFrom?: string;
  coverTo?: string;
  format: string;
  type: string;
  rating?: number;
  reviewCount?: number;
  description: string;
}

interface QuickHoverMenuProps {
  product: QuickHoverItem;
  /** Optional trigger element — if not provided, the component wraps children */
  children?: React.ReactNode;
  onAddToCart?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function QuickHoverMenu({ product, children, onAddToCart, onViewDetails }: QuickHoverMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  }, []);

  // Load preview image on hover
  useEffect(() => {
    if (isOpen && product.coverImage && !previewImage) {
      setPreviewImage(product.coverImage);
    }
  }, [isOpen, product.coverImage, previewImage]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleAddToCart = useCallback(() => {
    onAddToCart?.(product.id);
    setIsOpen(false);
  }, [onAddToCart, product.id]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(product.id);
    setIsOpen(false);
  }, [onViewDetails, product.id]);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={menuRef}
    >
      {children}

      {/* Hover menu */}
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border shadow-2xl backdrop-blur-md"
          style={{
            borderColor: "var(--color-border,#334155)",
            backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 95%, transparent)",
          }}
          role="dialog"
          aria-label={`Quick preview: ${product.title}`}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={() => {
            timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
          }}
        >
          {/* Arrow */}
          <div
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r"
            style={{
              borderColor: "var(--color-border,#334155)",
              backgroundColor: "var(--color-surface,#1e293b)",
            }}
          />

          {/* Preview content */}
          <div className="p-4">
            {/* Cover thumbnail */}
            <div className="mb-3 flex gap-3">
              <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${product.coverFrom ?? "from-indigo-500"} ${product.coverTo ?? "to-purple-700"} text-lg`}
                  >
                    {product.coverIcon ?? "📦"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {product.title}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {product.author}
                </p>
                {product.rating && product.rating > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <svg
                          key={i}
                          className={`h-3 w-3 ${i < Math.round(product.rating!) ? "text-yellow-400" : "text-gray-600"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {product.reviewCount && (
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        ({product.reviewCount})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description preview */}
            <p className="mb-3 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {product.description}
            </p>

            {/* Format badge + price */}
            <div className="mb-3 flex items-center justify-between">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)",
                  color: "var(--color-primary,#6366f1)",
                }}
              >
                {product.format}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {product.hasDiscount && product.displayPrice !== undefined ? (
                  <>
                    <span className="mr-1 text-[10px] line-through opacity-60" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      ${product.price.toFixed(2)}
                    </span>
                    ${product.displayPrice.toFixed(2)}
                  </>
                ) : (
                  `$${product.price.toFixed(2)}`
                )}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                aria-label={`${t("product.buy")} ${product.title}`}
              >
                {t("product.buy")}
              </button>
              <button
                type="button"
                onClick={handleViewDetails}
                className="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
                style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text,#f8fafc)" }}
                aria-label={`${t("quickHover.details") ?? "View Details"} ${product.title}`}
              >
                {t("quickHover.details") ?? "View Details"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}