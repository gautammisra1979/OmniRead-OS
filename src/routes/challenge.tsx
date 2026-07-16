import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { getCatalogItems } from "~/data/catalog";
import { getProgressEntries, getReviews, type ReviewData } from "~/data/progress";
import { ProgressTracker } from "~/components/ProgressTracker";
import { NotificationSettings } from "~/components/NotificationSettings";
import { ReviewForm } from "~/components/ReviewForm";
import { ReviewCard } from "~/components/ReviewCard";

export const Route = createFileRoute("/challenge")({
  component: ChallengePage,
});

function ChallengePage() {
  const { t } = useLanguage();
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);

  const catalog = getCatalogItems();
  const progressEntries = getProgressEntries();
  const trackedProductIds = new Set(progressEntries.map((e) => e.productId));
  const trackedProducts = progressEntries
    .map((e) => catalog.find((c) => c.id === e.productId))
    .filter(Boolean) as typeof catalog;

  const allReviews = getReviews();
  const publicReviews = allReviews.filter((r) => !r.isPrivate);

  const activeProduct = activeProductId ? catalog.find((c) => c.id === activeProductId) : null;
  const reviewProduct = reviewProductId ? catalog.find((c) => c.id === reviewProductId) : null;

  return (
    <LicenseGate feature="challenge" featureName={t("challenge.title")} featureIcon="🏆">
      <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg)" }}>
        {/* Header */}
        <div className="py-12 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "var(--color-text)" }}>
            {t("challenge.title")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("challenge.subtitle")}
          </p>
        </div>

        <div className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 lg:px-8">
          {/* Section 1: Progress Overview */}
          <section>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {t("challenge.pacingLabel")}
            </h2>
            {trackedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {trackedProducts.slice(0, 4).map((product) => (
                  <div key={product.id}>
                    {activeProductId === product.id ? (
                      <ProgressTracker product={product} />
                    ) : (
                      <div
                        className="flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors hover:opacity-80"
                        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                        onClick={() => setActiveProductId(product.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") setActiveProductId(product.id); }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                            {product.title}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {product.author}
                          </p>
                        </div>
                        <span className="rounded-md border px-2.5 py-1 text-xs font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                          {t("challenge.viewProgress")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {t("challenge.noProgress")}
                </p>
              </div>
            )}
          </section>

          {/* Section 2: Tracked Products */}
          <section>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              Products
            </h2>
            {trackedProducts.length > 0 ? (
              <div className="space-y-3">
                {trackedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl border px-5 py-4"
                    style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        {product.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {product.author}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveProductId(activeProductId === product.id ? null : product.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                      >
                        {t("challenge.viewProgress")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewProductId(product.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                      >
                        {getReviews().find((r) => r.productId === product.id)
                          ? t("challenge.editReview")
                          : t("challenge.writeReview")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {t("challenge.noProgress")}
                </p>
              </div>
            )}
          </section>

          {/* Section 3: Notification Settings */}
          <section>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {t("challenge.notifTitle")}
            </h2>
            <NotificationSettings />
          </section>

          {/* Section 4: Public Reviews */}
          <section>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {t("challenge.publicReviews")}
            </h2>
            {publicReviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publicReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {t("challenge.noReviews")}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Review Form Modal */}
        {reviewProduct && (
          <ReviewForm
            productId={reviewProduct.id}
            productTitle={reviewProduct.title}
            onClose={() => setReviewProductId(null)}
            onSaved={() => setReviewRefresh((r) => r + 1)}
          />
        )}

        {/* Active product progress tracker inline */}
        {activeProduct && activeProductId && (
          <div className="mx-auto mt-10 max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setActiveProductId(null)}
              className="mb-4 text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--color-primary,#6366f1)" }}
            >
              &larr; Back to overview
            </button>
            <ProgressTracker product={activeProduct} />
          </div>
        )}
      </div>
    </LicenseGate>
  );
}