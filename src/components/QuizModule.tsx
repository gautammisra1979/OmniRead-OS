import { useState, useCallback, useMemo } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { defaultQuiz, type QuizQuestion, type QuizOption } from "~/data/defaultQuiz";

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

interface QuizModuleProps {
  onComplete: (selections: Record<string, string>) => void;
}

export function QuizModule({ onComplete }: QuizModuleProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Shuffle options once on mount — pick 4 per question
  const shuffledOptions = useMemo(() => {
    return defaultQuiz.map((q) => shuffleAndPick(q.options, 4));
  }, []);

  const currentQuestion = defaultQuiz[currentIndex];
  const currentOptions = shuffledOptions[currentIndex];
  const totalQuestions = defaultQuiz.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalQuestions - 1;

  const handleSelect = useCallback((tag: string) => {
    setSelectedOption(tag);
  }, []);

  const handleNext = useCallback(() => {
    if (!selectedOption) return;

    const newSelections = {
      ...selections,
      [currentQuestion.column]: selectedOption,
    };
    setSelections(newSelections);

    if (isLast) {
      onComplete(newSelections);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    }
  }, [selectedOption, currentQuestion.column, selections, isLast, onComplete]);

  const handleBack = useCallback(() => {
    if (isFirst) return;
    const prevQuestion = defaultQuiz[currentIndex - 1];
    setCurrentIndex((i) => i - 1);
    setSelectedOption(selections[prevQuestion.column] ?? null);
  }, [currentIndex, isFirst, selections]);

  const handleStartOver = useCallback(() => {
    setCurrentIndex(0);
    setSelections({});
    setSelectedOption(null);
  }, []);

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Progress Bar */}
      <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>
          {t("quiz.progress")
            .replace("{current}", String(currentIndex + 1))
            .replace("{total}", String(totalQuestions))}
        </span>
        <button
          type="button"
          onClick={handleStartOver}
          className="underline underline-offset-2 transition-colors hover:opacity-80"
          aria-label={t("quiz.startOver")}
        >
          {t("quiz.startOver")}
        </button>
      </div>
      <div
        className="mb-8 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border)" }}
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalQuestions}
        aria-label={t("quiz.progress")
          .replace("{current}", String(currentIndex + 1))
          .replace("{total}", String(totalQuestions))}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: "var(--color-primary,#6366f1)",
          }}
        />
      </div>

      {/* Question Header */}
      <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
        {currentQuestion.question}
      </h2>
      <p className="mb-8 mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {currentQuestion.subtitle}
      </p>

      {/* Option Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {currentOptions.map((option) => {
          const isSelected = selectedOption === option.tag;
          return (
            <button
              key={option.tag}
              type="button"
              onClick={() => handleSelect(option.tag)}
              className={`group rounded-xl border-2 p-5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isSelected
                  ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
                  : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30 hover:border-[var(--color-primary,#6366f1)]/50"
              }`}
              aria-pressed={isSelected}
              aria-label={`${option.text}: ${option.description}`}
            >
              <h3
                className={`text-base font-semibold ${
                  isSelected
                    ? "text-[var(--color-primary,#6366f1)]"
                    : "text-[var(--color-text,#f8fafc)]"
                }`}
              >
                {option.text}
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        {!isFirst ? (
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            aria-label={t("quiz.back")}
          >
            {t("quiz.back")}
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedOption}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          aria-label={isLast ? t("quiz.resultsTitle") : t("quiz.next")}
        >
          {isLast ? t("quiz.resultsTitle") : t("quiz.next")}
        </button>
      </div>
    </div>
  );
}
