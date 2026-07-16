import { useState, useEffect } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";
import { getActiveReferrer } from "~/data/affiliate";

interface CrossSellGridProps {
  product: CatalogItem;
}

function scoreMatch(a: CatalogItem, b: CatalogItem): number {
  const aTags = [
    ...(a.quizMood ?? []),
    ...(a.quizFormat ?? []),
    ...(a.quizHook ?? []),
    ...(a.quizPace ?? []),
  ];
  const bTags = [
    ...(b.quizMood ?? []),
    ...(b.quizFormat ?? []),
    ...(b.quizHook ?? []),
    ...(b.quizPace ?? []),
  ];
  return aTags.filter((tag) => bTags.includes(tag)).length;
}

export function CrossSellGrid({ product }: CrossSellGridProps) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState<CatalogItem[]>([]);
  const [refParam, setRefParam] = useState("");

  useEffect(() => {
    const all = getCatalogItems().filter((item) => item.id !== product.id);
    const scored = all
      .map((item) => ({ item, score: scoreMatch(product, item) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item }) => item);
    setMatches(scored);

    const activeRef = getActiveReferrer();
    if (activeRef) setRefParam(activeRef.ref);
  }, [product.id, product.quizMood, product.quizFormat, product.quizHook, product.quizPace]);

  if (matches.length === 0) return null;

  const buildLink = (path: string): string => {
    const base = path.startsWith("/") ? path : `/${path}`;
    return refParam ? `${base}?ref=${encodeURIComponent(refParam)}` : base;
  };

  return (
    <section
      className="mt-6 rounded-xl border p-4"
      style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
      aria-label={t("affiliate.crossSellTitle")}
    >
      <h3
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--color-text,#f8fafc)" }}
      >
        {t("affiliate.crossSellTitle")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((item) => (
          <article
            key={item.id}
            className="group flex flex-col overflow-hidden rounded-lg border transition-all hover:opacity-90"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}
          >
            {/* Cover / Placeholder */}
            <div
              className="flex h-24 items-center justify-center overflow-hidden"
              style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" }}
            >
              {item.coverImage ? (
                <img
                  src={item.coverImage}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                  {item.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <h4
                className="text-xs font-semibold leading-tight line-clamp-2"
                style={{ color: "var(--color-text,#f8fafc)" }}
              >
                {item.title}
              </h4>
              <p className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {item.author}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)",
                    color: "var(--color-primary,#6366f1)",
                  }}
                >
                  {item.format}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
                  ${item.price.toFixed(2)}
                </span>
              </div>
              <a
                href={buildLink(`/product/${item.id}`)}
                className="mt-auto inline-flex items-center justify-center rounded-lg px-2 py-1 text-[10px] font-semibold text-white transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                aria-label={`View ${item.title}`}
              >
                View
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}