import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { getAllProducts, type Product } from "~/data/products";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";
import { MediaPlayer } from "~/components/MediaPlayer";
import { CrossSellGrid } from "~/components/CrossSellGrid";
import { CommentTree } from "~/components/CommentTree";
import { getPromoSettings } from "~/data/promotions";
import { addToCart } from "~/data/cart";

export const Route = createFileRoute("/product")({
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = useParams({ from: "/product/$productId" });
  const { t } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    // Reload to get fresh discount data
    const all = getAllProducts();
    const found = all.find((p) => p.id === productId) ?? null;
    setProduct(found);

    const catItems = getCatalogItems();
    const catFound = catItems.find((c) => c.id === productId) ?? null;
    setCatalogItem(catFound);
  }, [productId]);

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          Product not found.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
        >
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <main role="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{ color: "var(--color-text-muted,#94a3b8)" }}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Store
      </Link>

      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
        {/* Cover */}
        <div
          className="flex h-48 items-center justify-center sm:h-56"
          style={{ background: product.coverImage ? `url(${product.coverImage}) center/cover` : "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))" }}
        >
          {!product.coverImage && (
            <span className="select-none text-5xl" aria-hidden="true">
              {product.type === "ebook" ? "📖" : product.type === "audiobook" ? "🎧" : "🎬"}
            </span>
          )}
          <span
            className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
          >
            {product.format}
          </span>
        </div>

        <div className="p-6">
          {/* Title & Author */}
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {product.title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            by {product.author}
          </p>

          {/* Description */}
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {product.description}
          </p>

          {/* Price */}
          <div className="mt-6 flex items-center gap-3">
            {product.hasDiscount && product.displayPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-lg line-through" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-2xl font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                  ${product.displayPrice.toFixed(2)}
                </span>
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                  {t("promo.salePrice")}
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>

          {/* Media Player (gated) */}
          {(product.type === "audiobook" || product.type === "video") && (
            <div className="mt-6">
              <LicenseGate feature="product-media" featureName="Media Player" featureIcon="🎬">
                <MediaPlayer
                  product={catalogItem ?? { ...product, coverImage: null, mediaFile: { name: "", dataUrl: null }, quizMood: [], quizFormat: [], quizHook: [], quizPace: [], promoFlatBonus: 0, promoOverride: undefined, createdAt: "" } as any}
                />
              </LicenseGate>
            </div>
          )}

          {/* Add to Cart */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
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
                alert(`"${product.title}" added to cart!`);
              }}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              aria-label={`Add ${product.title} to cart`}
            >
              {t("product.buy")}
            </button>
          </div>
        </div>
      </div>

      {/* Discussion Comments (gated) */}
      <LicenseGate feature="comments" featureName={t("comments.title") ?? "Discussion"} featureIcon="💬">
        <CommentTree productId={product.id} />
      </LicenseGate>

      {/* Cross-Sell (gated) */}
      {catalogItem && (
        <div className="mt-8">
          <LicenseGate feature="affiliate" featureName={t("affiliate.crossSellTitle") ?? "Related Products"} featureIcon="🔗">
            <CrossSellGrid product={catalogItem} />
          </LicenseGate>
        </div>
      )}
    </main>
  );
}