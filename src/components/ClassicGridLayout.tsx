import { Link } from "@tanstack/react-router";
import { HeroSection } from "~/components/HeroSection";
import { ProductGrid } from "~/components/ProductGrid";
import { useLanguage } from "~/components/LanguageProvider";

export function ClassicGridLayout() {
  const { t } = useLanguage();
  return (
    <>
      <HeroSection />

      {/* Quiz CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div
          className="rounded-2xl border p-10 shadow-lg"
          style={{
            borderColor: "var(--color-border,#334155)",
            backgroundColor: "var(--color-surface,#1e293b)/50",
          }}
        >
          <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
            Not sure where to start?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--color-text-muted)" }}>
            Take our 60-second quiz and get personalized recommendations tailored to your mood,
            format preference, and available time.
          </p>
          <Link
            to="/quiz"
            className="mt-8 inline-block rounded-lg px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            aria-label={t("quiz.takeQuiz")}
          >
            {t("quiz.takeQuiz")}
          </Link>
        </div>
      </section>

      <ProductGrid />
    </>
  );
}