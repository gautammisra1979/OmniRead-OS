import { useState } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import type { ReviewData } from "~/data/progress";

interface ReviewCardProps {
  review: ReviewData;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useLanguage();
  const [spoilerOpen, setSpoilerOpen] = useState(false);

  if (review.isPrivate) return null;

  const statusColors: Record<string, string> = {
    Ahead: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "On-Track": "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    Behind: "text-red-400 bg-red-500/10 border-red-500/30",
  };

  return (
    <div
      className="rounded-xl border p-5 transition-all hover:shadow-md"
      style={{
        borderColor: "var(--color-border,#334155)",
        backgroundColor: "var(--color-surface,#1e293b)/50",
      }}
    >
      {/* Rating */}
      <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`h-4 w-4 ${review.rating >= star ? "text-yellow-400" : "text-gray-600"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Key Takeaway */}
      <p className="mt-2 text-sm font-semibold leading-snug" style={{ color: "var(--color-text)" }}>
        {review.keyTakeaway}
      </p>

      {/* Action Plan */}
      {review.actionPlan && (
        <div className="mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-bg)" }}>
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            {t("challenge.actionPlan")}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text)" }}>
            {review.actionPlan}
          </p>
        </div>
      )}

      {/* Pacing Badge */}
      <div className="mt-3">
        <span
          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            statusColors[review.pacingEval] ?? "text-gray-400"
          }`}
        >
          {t(`challenge.status${review.pacingEval === "Ahead" ? "Ahead" : review.pacingEval === "On-Track" ? "OnTrack" : "Behind"}`)}
        </span>
      </div>

      {/* Spoiler Protected Review Text */}
      {review.reviewText && review.hasSpoiler ? (
        <details
          className="mt-3"
          onToggle={(e) => setSpoilerOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary
            className="cursor-pointer text-xs font-medium underline underline-offset-2"
            style={{ color: "var(--color-primary,#6366f1)" }}
          >
            {t("challenge.spoilerReveal")}
          </summary>
          <div className={`mt-2 rounded-lg p-3 text-xs leading-relaxed transition-all ${
            spoilerOpen ? "" : "blur-sm"
          }`} style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
            {review.reviewText}
          </div>
        </details>
      ) : review.reviewText ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {review.reviewText}
        </p>
      ) : null}

      {/* Product attribution */}
      <p className="mt-3 text-[11px] opacity-60" style={{ color: "var(--color-text-muted)" }}>
        — {review.productTitle}
      </p>
    </div>
  );
}