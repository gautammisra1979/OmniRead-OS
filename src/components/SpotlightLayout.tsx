import { useMemo } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";
import { getAllProducts, type Product } from "~/data/products";
import { getFeaturedProductId, getLatestCatalogItem } from "~/data/layoutMatrix";
import { getPromoSettings, calculateDiscountedPrice } from "~/data/promotions";

export function SpotlightLayout() {
  const { t } = useLanguage();
  const allProducts = useMemo(() => getAllProducts(), []);
  const catalogItems = useMemo(() => getCatalogItems(), []);

  const featuredId = getFeaturedProductId();
  let featuredProduct: Product | null = null;

  if (featuredId) {
    featuredProduct = allProducts.find((p) => p.id === featuredId) ?? null;
  }

  if (!featuredProduct) {
    // Fallback to newest catalog item
    const latest = getLatestCatalogItem(catalogItems);
    if (latest) {
      const settings = getPromoSettings();
      const { discounted, hasDiscount } = calculateDiscountedPrice(
        latest.price,
        latest.promoOverride ?? null,
        settings,
        latest.type,
      );
      featuredProduct = {
        id: latest.id,
        title: latest.title,
        author: latest.author,
        description: latest.description,
        price: latest.price,
        displayPrice: hasDiscount ? discounted : undefined,
        hasDiscount: hasDiscount,
        format: latest.format,
        type: latest.type,
        coverImage: latest.coverImage,
        coverFrom: latest.coverImage ? undefined : "from-indigo-500",
        coverTo: latest.coverImage ? undefined : "to-purple-700",
        coverIcon: latest.coverImage ? undefined : "📦",
      };
    } else if (allProducts.length > 0) {
      featuredProduct = allProducts[0];
    }
  }

  const secondaryProducts = allProducts.filter(
    (p) => p.id !== featuredProduct?.id,
  );

  return (
    <>
      {/* Minimal accent banner */}
      <div
        className="w-full py-2 text-center text-xs font-medium uppercase tracking-wider"
        style={{
          backgroundColor: "var(--color-primary,#6366f1)",
          color: "#fff",
        }}
      >
        {t("layout.spotlightDesc") ?? "Spotlight — Featured Product"}
      </div>

      {/* Split-screen feature */}
      {featuredProduct && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            {/* Left: Cover image */}
            <div className="flex items-center justify-center">
              {featuredProduct.coverImage ? (
                <img
                  src={featuredProduct.coverImage}
                  alt={featuredProduct.title}
                  className="w-full max-w-sm rounded-2xl shadow-2xl object-cover aspect-[3/4]"
                />
              ) : (
                <div
                  className={`flex aspect-[3/4] w-full max-w-sm items-center justify-center rounded-2xl bg-gradient-to-br ${featuredProduct.coverFrom ?? "from-indigo-500"} ${featuredProduct.coverTo ?? "to-purple-700"} shadow-2xl`}
                >
                  <span className="text-6xl">{featuredProduct.coverIcon ?? "📦"}</span>
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="flex flex-col justify-center space-y-4">
              <span
                className="inline-block w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)",
                  color: "var(--color-primary,#6366f1)",
                }}
              >
                {featuredProduct.format}
              </span>
              <h1
                className="text-3xl font-bold sm:text-4xl"
                style={{ color: "var(--color-text)" }}
              >
                {featuredProduct.title}
              </h1>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {featuredProduct.author}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {featuredProduct.description}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                  {featuredProduct.hasDiscount && featuredProduct.displayPrice !== undefined ? (
                    <>
                      <span className="mr-2 text-base line-through opacity-60" style={{ color: "var(--color-text-muted)" }}>
                        ${featuredProduct.price.toFixed(2)}
                      </span>
                      ${featuredProduct.displayPrice.toFixed(2)}
                    </>
                  ) : (
                    `$${featuredProduct.price.toFixed(2)}`
                  )}
                </span>
                <button
                  type="button"
                  className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                  aria-label={`${t("product.buy")} ${featuredProduct.title}`}
                >
                  {t("product.buy")}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Secondary products list */}
      {secondaryProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h2
            className="mb-6 text-lg font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {t("products.heading")}
          </h2>
          <div className="space-y-4">
            {secondaryProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:opacity-80"
                style={{
                  borderColor: "var(--color-border,#334155)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)",
                }}
              >
                {/* Thumbnail */}
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                  {product.coverImage ? (
                    <img
                      src={product.coverImage}
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
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {product.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {product.author}
                  </p>
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                  {product.format}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  {product.hasDiscount && product.displayPrice !== undefined ? (
                    <>
                      <span className="mr-1 text-xs line-through opacity-60" style={{ color: "var(--color-text-muted)" }}>
                        ${product.price.toFixed(2)}
                      </span>
                      ${product.displayPrice.toFixed(2)}
                    </>
                  ) : (
                    `$${product.price.toFixed(2)}`
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}