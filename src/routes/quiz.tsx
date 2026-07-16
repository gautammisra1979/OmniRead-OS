import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { LicenseGate } from "~/components/LicenseGate";
import { QuizModule } from "~/components/QuizModule";
import { QuizResults } from "~/components/QuizResults";

export const Route = createFileRoute("/quiz")({
  component: QuizPage,
});

function QuizPage() {
  const { t } = useLanguage();
  const [selections, setSelections] = useState<Record<string, string> | null>(null);

  return (
    <LicenseGate feature="quiz" featureName={t("quiz.title")} featureIcon="📋">
      {!selections ? (
        <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
          {/* Header */}
          <div className="py-16 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "var(--color-text)" }}>
              {t("quiz.title")}
            </h1>
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("quiz.subtitle")}
            </p>
          </div>
          <QuizModule onComplete={(s) => setSelections(s)} />
        </div>
      ) : (
        <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
          <QuizResults
            selections={selections}
            onStartOver={() => setSelections(null)}
          />
        </div>
      )}
    </LicenseGate>
  );
}
