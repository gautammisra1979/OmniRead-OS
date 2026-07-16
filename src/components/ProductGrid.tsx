import { useState, useCallback, useEffect } from "react";
import { getAllProducts, type Product } from "~/data/products";
import { useLanguage } from "~/components/LanguageProvider";
import { CrossSellGrid } from "~/components/CrossSellGrid";
import { MediaPlayer } from "~/components/MediaPlayer";
import { addToCart } from "~/data/cart";

function Toast({
  message,
  visible,
  onClose,
}: {
  message: string;
  visible: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 animate-slide-up rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg"
      style={{ backgroundColor: "var(--color-primary)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {message}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  index,
  onBuy,
}: {
  product: Product;
  index: number;
  onBuy: (title: string) => void;
}) {
  const { t } = useLanguage();
  const hasQuizTags = !!(product.quizMood?.length || product.quizFormat?.length || product.quizHook?.length || product.quizPace?.length);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border shadow-lg backdrop-blur-sm transition-all hover:shadow-xl"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)",
        animationDelay: `${index * 150}ms`,
      }}
      aria-label={`${product.title} by ${product.author}`}
    >
      <div
        className={`relative flex h-48 items-center justify-center sm:h-52 ${
          product.coverImage ? "" : "bg-gradient-to-br " + (product.coverFrom ?? "from-indigo-500") + " " + (product.coverTo ?? "to-purple-700")
        }`}
        style={product.coverImage ? { background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))" } : undefined}
      >
        {product.coverImage ? (
          <img
            src={product.coverImage}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="select-none text-6xl" aria-hidden="true">
            {product.coverIcon ?? "📦"}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {product.format}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <StarRating rating={4.7} />

        <h3 className="text-lg font-semibold leading-tight" style={{ color: "var(--color-text)" }}>
          {product.title}
        </h3>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          by {product.author}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          {product.hasDiscount && product.displayPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-sm line-through" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xl font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                ${product.displayPrice.toFixed(2)}
              </span>
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-400">
                {t("promo.salePrice")}
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              ${product.price.toFixed(2)}
            </span>
          )}
          <button
            type="button"
            onClick={() => onBuy(product.title)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: "var(--color-primary)" }}
            aria-label={`${t("product.buy")} ${product.title}`}
          >
            {t("product.buy")}
          </button>
        </div>
        {hasQuizTags && (
          <CrossSellGrid product={product as any} />
        )}
        {(product.type === "audiobook" || product.type === "video") && (
          <MediaPlayer product={{ ...product, coverImage: null, mediaFile: { name: "", dataUrl: null }, quizMood: [], quizFormat: [], quizHook: [], quizPace: [], promoFlatBonus: 0, promoOverride: undefined, createdAt: "" } as any} />
        )}
      </div>
    </article>
  );
}

export function ProductGrid() {
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useLanguage();

  // Re-render when storage changes (admin adds products in another tab)
  useEffect(() => {
    const handleStorage = () => setRefreshKey((k) => k + 1);
    window.addEventListener("storage", handleStorage);
    // Also poll every 2 seconds for same-tab updates
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 2000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const allProducts = getAllProducts();

  const handleBuy = useCallback(
    (title: string) => {
      setToastMsg(`"${title}" ${t("product.added")}`);
      setToastVisible(true);
      // Find the product and add to cart
      const product = allProducts.find(p => p.title === title);
      if (product) {
        addToCart({
          productId: product.id,
          title: product.title,
          author: product.author,
          price: product.hasDiscount && product.displayPrice ? product.displayPrice : product.price,
          type: product.type,
          format: product.format,
          coverImage: product.coverImage ?? null,
          quantity: 1,
        });
      }
    },
    [t, allProducts],
  );

  const closeToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return (
    <section id="products" className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: "var(--color-text)" }}
          >
            {t("products.heading")}
          </h2>
          <p className="mt-4 text-lg" style={{ color: "var(--color-text-muted)" }}>
            {t("products.subtitle")}
          </p>
        </div>

        {allProducts.length === 0 ? (
          <p className="mt-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No products available yet. Check back soon!
          </p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <ProductCard product={product} index={index} onBuy={handleBuy} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Toast message={toastMsg} visible={toastVisible} onClose={closeToast} />
    </section>
  );
}