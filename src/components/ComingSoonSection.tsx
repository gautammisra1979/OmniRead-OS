import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getComingSoonCatalogItems, getCatalogItems } from "~/data/catalog";
import { getAllProducts, type Product } from "~/data/products";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-[10px] opacity-60" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

export function ComingSoonSection() {
  const { t } = useLanguage();
  const [notifyIds, setNotifyIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Hydration guard — skip SSR render to avoid window access during SSR
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Re-render when storage changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = () => setRefreshKey((k) => k + 1);
    window.addEventListener("storage", handleStorage);
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 2000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (!hydrated) return null;

  const allProducts = getAllProducts();
  const comingSoonItems = allProducts.filter((p) => p.status === "coming-soon");

  // Also check raw catalog items for coming-soon status
  const catalogItems = getCatalogItems();
  const rawComingSoon = catalogItems.filter((c) => c.status === "coming-soon");
  // Merge with product data
  const displayItems = rawComingSoon.length > 0
    ? rawComingSoon.map((c) => {
        const product = allProducts.find((p) => p.id === c.id);
        return product ?? c;
      })
    : comingSoonItems;

  if (displayItems.length === 0) return null;

  const handleNotify = useCallback((id: string) => {
    setNotifyIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Store notification preference
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem("omnimedos_notify_list") || "[]");
      if (!existing.includes(id)) {
        existing.push(id);
        localStorage.setItem("omnimedos_notify_list", JSON.stringify(existing));
      }
    }
  }, []);

  const handlePreOrder = useCallback((id: string) => {
    // Add to cart as pre-order (price 0 or placeholder)
    if (typeof window !== "undefined") {
      import("~/data/cart").then(({ addToCart }) => {
        const product = allProducts.find((p) => p.id === id);
        if (product) {
          addToCart({
            productId: product.id,
            title: product.title,
            author: product.author,
            price: product.price,
            type: product.type,
            format: product.format,
            coverImage: product.coverImage ?? null,
            quantity: 1,
          });
        }
      });
    }
  }, [allProducts]);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--color-text)" }}>
            {t("comingSoon.title") ?? "Coming Soon"}
          </h2>
          <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("comingSoon.subtitle") ?? "Be the first to know when these products launch."}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(displayItems as any[]).slice(0, 9).map((item: any, index: number) => {
            const id = item.id;
            const title = item.title ?? "Unknown";
            const author = item.author ?? "";
            const coverImage = item.coverImage ?? null;
            const coverFrom = item.coverFrom ?? "from-indigo-500";
            const coverTo = item.coverTo ?? "to-purple-700";
            const coverIcon = item.coverIcon ?? "🔮";
            const format = item.format ?? "Coming Soon";
            const rating = item.rating ?? 0;
            const description = item.description ?? "";
            const price = item.price ?? 0;
            const isNotified = notifyIds.has(id);

            return (
              <article
                key={id}
                className="group flex flex-col overflow-hidden rounded-2xl border shadow-lg backdrop-blur-sm transition-all hover:shadow-xl"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)",
                  animationDelay: `${index * 150}ms`,
                }}
                aria-label={`${title} by ${author} — Coming Soon`}
              >
                {/* Cover */}
                <div
                  className="relative flex h-44 items-center justify-center sm:h-48"
                  style={coverImage ? { background: `url(${coverImage}) center/cover` } : { background: `linear-gradient(135deg, ${coverFrom.replace("from-", "")}, ${coverTo.replace("to-", "")})` }}
                >
                  {!coverImage && (
                    <span className="select-none text-5xl" aria-hidden="true">
                      {coverIcon}
                    </span>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
                    {t("comingSoon.badge") ?? "Coming Soon"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  {rating > 0 && <StarRating rating={rating} />}

                  <h3 className="text-base font-semibold leading-tight" style={{ color: "var(--color-text)" }}>
                    {title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {author}
                  </p>
                  <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    {description}
                  </p>

                  {format && (
                    <span className="inline-block w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)",
                        color: "var(--color-primary,#6366f1)",
                      }}
                    >
                      {format}
                    </span>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                      ${price.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      {isNotified ? (
                        <span className="rounded-lg px-3 py-2 text-xs font-medium text-emerald-400" style={{ backgroundColor: "color-mix(in srgb, #34d399 15%, transparent)" }}>
                          {t("comingSoon.notified") ?? "✓ Notified"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleNotify(id)}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
                          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                          aria-label={`${t("comingSoon.notify") ?? "Get notified"} ${title}`}
                        >
                          {t("comingSoon.notify") ?? "Get Notified"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePreOrder(id)}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
                        style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text)" }}
                        aria-label={`${t("comingSoon.preOrder") ?? "Pre-order"} ${title}`}
                      >
                        {t("comingSoon.preOrder") ?? "Pre-order"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}