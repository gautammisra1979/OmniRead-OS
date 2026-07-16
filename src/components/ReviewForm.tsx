import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getReviewForProduct,
  saveReview,
  generateReviewId,
  type ReviewData,
} from "~/data/progress";

interface ReviewFormProps {
  productId: string;
  productTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ReviewForm({ productId, productTitle, onClose, onSaved }: ReviewFormProps) {
  const { t } = useLanguage();
  const [existing, setExisting] = useState<ReviewData | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [keyTakeaway, setKeyTakeaway] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [pacingEval, setPacingEval] = useState<"Ahead" | "On-Track" | "Behind">("On-Track");
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingReview = getReviewForProduct(productId);
    if (existingReview) {
      setExisting(existingReview);
      setRating(existingReview.rating);
      setKeyTakeaway(existingReview.keyTakeaway);
      setReviewText(existingReview.reviewText);
      setActionPlan(existingReview.actionPlan);
      setPacingEval(existingReview.pacingEval);
      setIsPrivate(existingReview.isPrivate);
      setHasSpoiler(existingReview.hasSpoiler);
    }
  }, [productId]);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    el.addEventListener("keydown", handleTab);
    return () => el.removeEventListener("keydown", handleTab);
  }, []);

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (rating === 0) return;
    const now = new Date().toISOString();
    const review: ReviewData = {
      id: existing?.id ?? generateReviewId(),
      productId,
      productTitle,
      rating,
      keyTakeaway: keyTakeaway.slice(0, 200),
      reviewText: reviewText.slice(0, 2000),
      actionPlan: actionPlan.slice(0, 500),
      pacingEval,
      isPrivate,
      hasSpoiler,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    saveReview(review);
    onSaved();
    onClose();
  }, [rating, existing, productId, productTitle, keyTakeaway, reviewText, actionPlan, pacingEval, isPrivate, hasSpoiler, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-form-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--color-surface,#1e293b)",
          borderColor: "var(--color-border,#334155)",
        }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--color-border,#334155)" }}>
          <h2 id="review-form-title" className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("challenge.reviewModalTitle").replace("{title}", productTitle)}
          </h2>
        </div>

        <div className="space-y-5 px-6 py-5 max-h-[65vh] overflow-y-auto">
          {/* Star Rating */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {t("challenge.rating")}
            </label>
            <div className="flex gap-1" role="radiogroup" aria-label={t("challenge.rating")}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating >= star}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className="p-0.5 transition-transform hover:scale-110"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <svg
                    className={`h-7 w-7 ${(hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-500"}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Key Takeaway */}
          <div>
            <label htmlFor="rf-takeaway" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {t("challenge.keyTakeaway")}
            </label>
            <input
              id="rf-takeaway"
              type="text"
              value={keyTakeaway}
              onChange={(e) => setKeyTakeaway(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            />
          </div>

          {/* Review Text */}
          <div>
            <label htmlFor="rf-text" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {t("challenge.reviewText")}
            </label>
            <textarea
              id="rf-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            />
          </div>

          {/* Action Plan */}
          <div>
            <label htmlFor="rf-action" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {t("challenge.actionPlan")}
            </label>
            <textarea
              id="rf-action"
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            />
          </div>

          {/* Pacing Evaluation */}
          <div>
            <label htmlFor="rf-pacing" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {t("challenge.pacingEval")}
            </label>
            <select
              id="rf-pacing"
              value={pacingEval}
              onChange={(e) => setPacingEval(e.target.value as "Ahead" | "On-Track" | "Behind")}
              className="w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1"
              style={{
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            >
              <option value="Ahead">{t("challenge.statusAhead")}</option>
              <option value="On-Track">{t("challenge.statusOnTrack")}</option>
              <option value="Behind">{t("challenge.statusBehind")}</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                aria-label={t("challenge.privacyToggle")}
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  isPrivate ? "bg-[var(--color-primary,#6366f1)]" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                    isPrivate ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm" style={{ color: "var(--color-text)" }}>
                {t("challenge.privacyToggle")}
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSpoiler}
                onChange={(e) => setHasSpoiler(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "var(--color-primary,#6366f1)" }}
                aria-label={t("challenge.spoilerFlag")}
              />
              <span className="text-sm" style={{ color: "var(--color-text)" }}>
                {t("challenge.spoilerFlag")}
              </span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: "var(--color-border,#334155)" }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-5 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            {t("challenge.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={rating === 0}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {t("challenge.save")}
          </button>
        </div>
      </div>
    </div>
  );
}