import { useLanguage } from "~/components/LanguageProvider";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section
      className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28 lg:px-8"
      style={{
        backgroundColor: "var(--color-bg)",
        backgroundImage:
          "linear-gradient(to bottom, var(--color-nav), var(--color-bg))",
      }}
    >
      {/* Decorative overlays */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-6 flex items-center justify-center">
          <span
            className="inline-flex animate-fade-in items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide"
            style={{
              borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
              color: "var(--color-primary)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
              aria-hidden="true"
            />
            {t("hero.badge")}
          </span>
        </div>

        {/* Heading */}
        <h1 className="animate-fade-in text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          style={{ color: "var(--color-text)" }}
        >
          {t("hero.title")?.split(",")[0]},{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(to right, var(--color-primary), #a78bfa)",
            }}
          >
            {t("hero.title")?.split(",")[1]?.trim() ?? "Published & Delivered."}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-in text-balance text-lg leading-8 sm:text-xl"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t("hero.subtitle")}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex animate-fade-in flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#products"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {t("hero.cta.browse")}
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
          <a
            href="#demo"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-8 py-3.5 text-base font-semibold shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
            style={{
              color: "var(--color-text)",
              borderColor: "var(--color-border)",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("hero.cta.demo")}
          </a>
        </div>
      </div>
    </section>
  );
}