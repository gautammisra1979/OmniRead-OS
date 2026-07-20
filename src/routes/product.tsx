import { useState, useEffect } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { getAllProducts, type Product } from "~/data/products";
import { type CatalogItem } from "~/data/catalog";
import { getCatalogItemById } from "~/db/queries";
import { MediaPlayer } from "~/components/MediaPlayer";
import { CrossSellGrid } from "~/components/CrossSellGrid";
import { CommentTree } from "~/components/CommentTree";
import { getPromoSettings } from "~/data/promotions";
import { addToCart } from "~/data/cart";

export const Route = createFileRoute("/product")({
  component: RouteComponent,
});

function StarRating({ rating, reviewCount, size = "sm" }: { rating: number; reviewCount?: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${starSize} ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className="ml-1 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}

function RouteComponent() {
  const { productId } = useParams({ from: "/product/$productId" });
  const { t, locale } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const all = getAllProducts();
    const found = all.find((p) => p.id === productId) ?? null;
    setProduct(found);
    if (found) {
      setSelectedFormat(found.format);
    }

    // DB-backed (Step 26 Phase 2, POC #1) — was a synchronous localStorage
    // read via getCatalogItems().find(...). Note: coverImage/mediaFile will
    // be null on any row until Vercel Blob wiring (Phase 2, item 3) lands.
    getCatalogItemById({ data: productId })
      .then((catFound) => {
        if (!cancelled) setCatalogItem(catFound);
      })
      .catch(() => {
        if (!cancelled) setCatalogItem(null);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
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
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

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

  const displayPrice = product.hasDiscount && product.displayPrice ? product.displayPrice : product.price;
  const formatOptions = [
    { value: "PDF E-Book", label: t("admin.catalog.typeEbook"), icon: "📖" },
    { value: "MP3 Audiobook", label: t("admin.catalog.typeAudiobook"), icon: "🎧" },
    { value: "MP4 Video Guide", label: t("admin.catalog.typeVideo"), icon: "🎬" },
  ];

  return (
    <main role="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
        style={{ color: "var(--color-text-muted,#94a3b8)" }}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        {t("hero.cta.browse")}
      </Link>

      {/* Kindle-style layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Cover art */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div
              className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: product.coverImage
                  ? `url(${product.coverImage}) center/cover`
                  : "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))",
              }}
            >
              {!product.coverImage && (
                <span className="select-none text-6xl" aria-hidden="true">
                  {product.type === "ebook" ? "📖" : product.type === "audiobook" ? "🎧" : "🎬"}
                </span>
              )}
            </div>

            {/* Format badge */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)",
                  color: "var(--color-primary,#6366f1)",
                }}
              >
                {product.format}
              </span>
              {product.status === "coming-soon" && (
                <span className="rounded-full bg-amber-500/30 px-3 py-1 text-[11px] font-semibold text-amber-300">
                  {t("comingSoon.badge")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* Title & Author */}
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "var(--color-text,#f8fafc)" }}>
                {product.title}
              </h1>
              <p className="mt-2 text-lg" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("reader.by") ?? "by"} {product.author}
              </p>
            </div>

            {/* Star Rating */}
            {(product.rating ?? 0) > 0 && (
              <StarRating rating={product.rating!} reviewCount={product.reviewCount} size="lg" />
            )}

            {/* Description */}
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {product.description}
            </p>

            {/* Metadata Table */}
            <div
              className="rounded-xl border p-4"
              style={{
                borderColor: "var(--color-border,#334155)",
                backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)",
              }}
            >
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--color-border,#334155)] last:border-0">
                    <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("reader.author") ?? "Author"}</td>
                    <td className="py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{product.author}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border,#334155)] last:border-0">
                    <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("reader.format") ?? "Format"}</td>
                    <td className="py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{product.format}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border,#334155)] last:border-0">
                    <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("reader.type") ?? "Type"}</td>
                    <td className="py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{product.type}</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border,#334155)] last:border-0">
                    <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("reader.rating") ?? "Rating"}</td>
                    <td className="py-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                      {product.rating ? `${product.rating.toFixed(1)} / 5` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("reader.reviews") ?? "Reviews"}</td>
                    <td className="py-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                      {product.reviewCount ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("reader.selectFormat") ?? "Select Format"}
              </label>
              <div className="flex flex-wrap gap-2">
                {formatOptions.map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.value)}
                    className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all"
                    style={{
                      borderColor: selectedFormat === fmt.value ? "var(--color-primary,#6366f1)" : "var(--color-border,#334155)",
                      backgroundColor: selectedFormat === fmt.value
                        ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)"
                        : "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)",
                      color: selectedFormat === fmt.value ? "var(--color-primary,#6366f1)" : "var(--color-text,#f8fafc)",
                    }}
                    aria-label={fmt.label}
                  >
                    <span aria-hidden="true">{fmt.icon}</span>
                    {fmt.label}
                  </button>
                ))}
              </div>
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

            {/* Sticky Action Panel */}
            <div
              className="sticky bottom-0 -mx-4 rounded-t-2xl border px-4 py-4 backdrop-blur-md sm:px-6 lg:static lg:mx-0 lg:rounded-2xl lg:border"
              style={{
                borderColor: "var(--color-border,#334155)",
                backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 95%, transparent)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Price */}
                <div>
                  <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {product.status === "coming-soon" ? (t("comingSoon.preOrder") ?? "Pre-order") : (t("product.buy") ?? "Buy")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: product.hasDiscount ? "var(--color-primary,#6366f1)" : "var(--color-text,#f8fafc)" }}>
                      ${displayPrice.toFixed(2)}
                    </span>
                    {product.hasDiscount && product.displayPrice && (
                      <span className="text-sm line-through" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Read Now (for ebooks) */}
                  {product.type === "ebook" && (
                    <Link
                      to="/reader/$productId"
                      params={{ productId: product.id }}
                      className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                      aria-label={t("reader.startReading") ?? "Start Reading"}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      {t("reader.startReading") ?? "Read Now"}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                    style={{ backgroundColor: addedToCart ? "#10b981" : "var(--color-primary,#6366f1)" }}
                    aria-label={`${addedToCart ? "Added" : "Add"} ${product.title} to cart`}
                  >
                    {addedToCart ? "✓ " + (t("product.added") ?? "Added!") : (t("product.buy") ?? "Add to Cart")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discussion Comments (gated) */}
      <div className="mt-12">
        <LicenseGate feature="comments" featureName={t("comments.title") ?? "Discussion"} featureIcon="💬">
          <CommentTree productId={product.id} />
        </LicenseGate>
      </div>

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
