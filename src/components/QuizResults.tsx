import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";

interface QuizResultsProps {
  selections: Record<string, string>;
  onStartOver: () => void;
}

interface ScoredProduct extends CatalogItem {
  score: number;
}

function computeScore(product: CatalogItem, selections: Record<string, string>): number {
  let score = 0;

  // Check quizMood
  if (product.quizMood && selections.quiz_mood) {
    if (product.quizMood.includes(selections.quiz_mood)) score++;
  }

  // Check quizFormat
  if (product.quizFormat && selections.quiz_format) {
    if (product.quizFormat.includes(selections.quiz_format)) score++;
  }

  // Check quizHook
  if (product.quizHook && selections.quiz_hook) {
    if (product.quizHook.includes(selections.quiz_hook)) score++;
  }

  // Check quizPace
  if (product.quizPace && selections.quiz_pace) {
    if (product.quizPace.includes(selections.quiz_pace)) score++;
  }

  return score;
}

export function QuizResults({ selections, onStartOver }: QuizResultsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const recommendations = useMemo<ScoredProduct[]>(() => {
    const items = getCatalogItems();
    const scored = items.map((item) => ({
      ...item,
      score: computeScore(item, selections),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }, [selections]);

  const hasMatches = recommendations.some((r) => r.score > 0);

  const typeStyles: Record<string, string> = {
    ebook: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    audiobook: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    video: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  };

  const typeLabels: Record<string, string> = {
    ebook: "PDF E-Book",
    audiobook: "MP3 Audiobook",
    video: "MP4 Video Guide",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          {t("quiz.resultsTitle")}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("quiz.resultsDesc")}
        </p>
      </div>

      {!hasMatches ? (
        <div className="mt-12 text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <svg className="h-10 w-10" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("quiz.noMatches")}
          </h3>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("quiz.resultsDesc")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              aria-label={t("quiz.browseAll")}
            >
              {t("quiz.browseAll")}
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
              aria-label={t("quiz.startOver")}
            >
              {t("quiz.startOver")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {recommendations.map((product, index) => (
            <div
              key={product.id}
              className="group relative overflow-hidden rounded-xl border transition-all hover:shadow-lg"
              style={{
                borderColor: "var(--color-border,#334155)",
                backgroundColor: "var(--color-surface,#1e293b)",
              }}
            >
              {/* Score badge */}
              <div
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                aria-label={`Match score: ${product.score} of 4`}
              >
                {product.score}
              </div>

              {/* Cover */}
              <div className="flex h-40 items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 80%, black)" }}>
                {product.coverImage ? (
                  <img
                    src={product.coverImage}
                    alt={`Cover for ${product.title}`}
                    className="h-full w-full object-contain p-4"
                    draggable={false}
                  />
                ) : (
                  <svg className="h-12 w-12" style={{ color: "var(--color-text-muted)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75A8.967 8.967 0 0012 6.042m0 0A8.967 8.967 0 016 14.25M12 6.042c.732 0 1.443.088 2.128.253M12 6.042c.732 0 1.443.088 2.128.253M18 6.042A8.967 8.967 0 0012 3.75A8.967 8.967 0 0018 6.042m0 0A8.967 8.967 0 0118 14.25M18 6.042a8.97 8.97 0 01-2.128.253m0 0c.416.73.708 1.556.853 2.453" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <span
                  className={`mb-2 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    typeStyles[product.type] ?? ""
                  }`}
                >
                  {typeLabels[product.type] ?? product.format}
                </span>
                <h3 className="mt-1 text-sm font-semibold leading-snug" style={{ color: "var(--color-text)" }}>
                  {product.title}
                </h3>
                <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {product.author}
                </p>
                <p className="mt-2 text-base font-bold" style={{ color: "var(--color-text)" }}>
                  ${product.price.toFixed(2)}
                </p>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg py-2 text-center text-xs font-semibold text-white transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                  aria-label={`Buy ${product.title} for $${product.price.toFixed(2)}`}
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Over */}
      {hasMatches && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            aria-label={t("quiz.startOver")}
          >
            {t("quiz.startOver")}
          </button>
        </div>
      )}
    </div>
  );
}
