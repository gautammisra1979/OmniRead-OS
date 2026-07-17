import { useMemo, useRef, useEffect, useState, type RefObject } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getAllProducts, type Product } from "~/data/products";
import { ComingSoonSection } from "~/components/ComingSoonSection";

const MAX_PER_ROW = 10;

function CarouselRow({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="mb-8">
      <h3
        className="mb-4 text-base font-semibold"
        style={{ color: "var(--color-text)" }}
      >
        {title}
      </h3>
      <div className="relative group">
        {/* Left arrow */}
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:scale-105"
          style={{
            backgroundColor: "var(--color-surface,#1e293b)",
            color: "var(--color-text)",
          }}
          aria-label="Scroll left"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Carousel container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--color-border) transparent",
          }}
          role="list"
          aria-label={title}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-48 snap-start"
              role="listitem"
            >
              <div
                className="overflow-hidden rounded-xl border"
                style={{
                  borderColor: "var(--color-border,#334155)",
                  backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)",
                }}
              >
                {/* Cover */}
                <div className="aspect-[3/4] w-full overflow-hidden">
                  {product.coverImage ? (
                    <img
                      src={product.coverImage}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${product.coverFrom ?? "from-indigo-500"} ${product.coverTo ?? "to-purple-700"} text-3xl`}
                    >
                      {product.coverIcon ?? "📦"}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {product.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {product.author}
                  </p>
                  <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                    {product.hasDiscount && product.displayPrice !== undefined ? (
                      <>
                        <span className="mr-1 text-[10px] line-through opacity-60" style={{ color: "var(--color-text-muted)" }}>
                          ${product.price.toFixed(2)}
                        </span>
                        ${product.displayPrice.toFixed(2)}
                      </>
                    ) : (
                      `$${product.price.toFixed(2)}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:scale-105"
          style={{
            backgroundColor: "var(--color-surface,#1e293b)",
            color: "var(--color-text)",
          }}
          aria-label="Scroll right"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MagazineLayout() {
  const { t } = useLanguage();
  const [hydrated, setHydrated] = useState(false);
  const allProducts = useMemo(() => getAllProducts(), []);

  // Hydration guard — skip SSR render to avoid server/client mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
          <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
            {t("layout.magazine") ?? "Magazine Stream"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("layout.magazineDesc") ?? "Browse by format"}
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border, #334155)", borderTopColor: "var(--color-primary, #6366f1)" }} aria-hidden="true" />
          <span className="sr-only">Loading...</span>
        </div>
      </section>
    );
  }

  const ebooks = allProducts.filter((p) => p.type === "ebook" && p.status !== "coming-soon").slice(0, MAX_PER_ROW);
  const audiobooks = allProducts.filter((p) => p.type === "audiobook" && p.status !== "coming-soon").slice(0, MAX_PER_ROW);
  const videos = allProducts.filter((p) => p.type === "video" && p.status !== "coming-soon").slice(0, MAX_PER_ROW);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div
        className="mb-8 rounded-2xl border p-6 text-center"
        style={{
          borderColor: "var(--color-border,#334155)",
          backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)",
        }}
      >
        <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "var(--color-text)" }}>
          {t("layout.magazine") ?? "Magazine Stream"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("layout.magazineDesc") ?? "Browse by format"}
        </p>
      </div>

      <CarouselRow
        title={t("admin.analytics.typeEbook") ?? "Digital Books"}
        products={ebooks}
      />
      <CarouselRow
        title={t("admin.analytics.typeAudiobook") ?? "Audiobooks"}
        products={audiobooks}
      />
      <CarouselRow
        title={t("admin.analytics.typeVideo") ?? "Video Courses"}
        products={videos}
      />

      <ComingSoonSection />
    </section>
  );
}