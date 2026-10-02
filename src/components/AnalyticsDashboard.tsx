import { useState, useEffect, useCallback } from "react";
import { getCatalogItems } from "~/db/queries";
import type { CatalogItem } from "~/data/catalog";
import { useLanguage } from "~/components/LanguageProvider";

/* ------------------------------------------------------------------ */
/*  Type breakdown helpers                                             */
/* ------------------------------------------------------------------ */

interface TypeBreakdown {
  ebook: number;
  audiobook: number;
  video: number;
}

function getTypeBreakdown(items: CatalogItem[]): TypeBreakdown {
  const breakdown: TypeBreakdown = { ebook: 0, audiobook: 0, video: 0 };
  for (const item of items) {
    if (item.type === "ebook") breakdown.ebook += 1;
    else if (item.type === "audiobook") breakdown.audiobook += 1;
    else if (item.type === "video") breakdown.video += 1;
  }
  return breakdown;
}

/* ------------------------------------------------------------------ */
/*  Panel sub-components                                              */
/* ------------------------------------------------------------------ */

function PanelCard({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}
      role="region"
      aria-label={title}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue Projection Panel                                          */
/* ------------------------------------------------------------------ */

function RevenueProjectionPanel({ portfolioValue, t }: { portfolioValue: number; t: (k: string) => string }) {
  const monthlyProjection = portfolioValue / 12;
  const target = 500;
  const percentOfTarget = Math.min((monthlyProjection / target) * 100, 100);

  return (
    <PanelCard title={t("admin.analytics.revenueProjection")}>
      <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {t("admin.analytics.monthlyProjected")}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
        ${monthlyProjection.toFixed(2)}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {t("admin.analytics.basedOn")} ${portfolioValue.toFixed(2)} {t("admin.analytics.portfolioValue").toLowerCase()}
      </p>

      {/* Target gauge */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span style={{ color: "var(--color-text-muted)" }}>{t("admin.analytics.target")}</span>
          <span style={{ color: "var(--color-text-muted)" }}>{percentOfTarget.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percentOfTarget}%`,
              background: `linear-gradient(90deg, var(--color-primary), ${percentOfTarget > 75 ? "#22c55e" : percentOfTarget > 40 ? "#f59e0b" : "var(--color-primary)"})`,
            }}
            role="progressbar"
            aria-valuenow={monthlyProjection}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`${t("admin.analytics.monthlyProjected")}: $${monthlyProjection.toFixed(2)} ${t("admin.analytics.ofTarget")}`}
          />
        </div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {percentOfTarget.toFixed(0)}% {t("admin.analytics.ofTarget")}
        </p>
      </div>
    </PanelCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Format Diversity Ring (Pure SVG Donut)                             */
/* ------------------------------------------------------------------ */

function FormatDiversityRing({ breakdown, t }: { breakdown: TypeBreakdown; t: (k: string) => string }) {
  const total = breakdown.ebook + breakdown.audiobook + breakdown.video;
  if (total === 0) {
    return (
      <PanelCard title={t("admin.analytics.formatDiversity")}>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.analytics.noActivity")}</p>
      </PanelCard>
    );
  }

  const segments: { label: string; value: number; color: string }[] = [
    { label: t("admin.analytics.typeEbook"), value: breakdown.ebook, color: "var(--color-primary)" },
    { label: t("admin.analytics.typeAudiobook"), value: breakdown.audiobook, color: "#f59e0b" },
    { label: t("admin.analytics.typeVideo"), value: breakdown.video, color: "#22c55e" },
  ];

  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <PanelCard title={t("admin.analytics.formatDiversity")}>
      <div className="flex flex-col items-center">
        {/* Donut SVG */}
        <svg viewBox="0 0 100 100" className="h-32 w-32" role="img" aria-label={t("admin.analytics.formatDiversity")}>
          {/* Background ring */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={10}
            aria-hidden="true"
          />
          {/* Data segments, drawn clockwise from top */}
          {segments.map((seg) => {
            if (seg.value === 0) return null;
            const percent = seg.value / total;
            const dashLength = percent * circumference;
            const dashOffset = -cumulativePercent * circumference;
            cumulativePercent += percent;

            return (
              <circle
                key={seg.label}
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={10}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90, 50, 50)"
                strokeLinecap="round"
                aria-hidden="true"
              />
            );
          })}
          {/* Center total label */}
          <text
            x={50}
            y={46}
            textAnchor="middle"
            fill="var(--color-text)"
            fontSize={14}
            fontWeight="bold"
            aria-hidden="true"
          >
            {total}
          </text>
          <text
            x={50}
            y={58}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize={7}
            aria-hidden="true"
          >
            {t("admin.analytics.total")}
          </text>
        </svg>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {segments.map((seg) => {
            const percent = total > 0 ? ((seg.value / total) * 100).toFixed(0) : "0";
            return (
              <div key={seg.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span style={{ color: "var(--color-text-muted)" }}>
                  {seg.label}
                </span>
                <span style={{ color: "var(--color-text)" }}>
                  {seg.value} ({percent}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PanelCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Stats Row                                                    */
/* ------------------------------------------------------------------ */

function QuickStatsRow({ items, t }: { items: CatalogItem[]; t: (k: string) => string }) {
  if (items.length === 0) return null;

  const mostExpensive = [...items].sort((a, b) => b.price - a.price)[0];
  const avgPrice = items.reduce((s, i) => s + i.price, 0) / items.length;
  const newest = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const daysSinceNew = Math.floor((Date.now() - new Date(newest.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const statBox = (label: string, value: string, sub: string) => (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p className="mt-1 text-base font-bold truncate" style={{ color: "var(--color-text)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
        {sub}
      </p>
    </div>
  );

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-3" role="region" aria-label="Quick statistics">
      {statBox(
        t("admin.analytics.mostExpensive"),
        `$${mostExpensive.price.toFixed(2)}`,
        mostExpensive.title,
      )}
      {statBox(
        t("admin.analytics.averagePrice"),
        `$${avgPrice.toFixed(2)}`,
        `${t("admin.analytics.basedOn")} ${items.length} ${items.length === 1 ? t("admin.analytics.product") : t("admin.analytics.products")}`,
      )}
      {statBox(
        t("admin.analytics.newestProduct"),
        newest.title,
        `${daysSinceNew} ${t("admin.analytics.daysAgo")}`,
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const [items, setItems] = useState<CatalogItem[]>([]);

  const refresh = useCallback(() => {
    getCatalogItems().then(setItems).catch(() => setItems([]));
    // Dispatch analytics refresh event so other components can react
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("omnimeda-analytics-refresh"));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for catalog publish events
  useEffect(() => {
    const handler = () => {
      refresh();
    };
    window.addEventListener("omnimeda-product-added", handler);
    return () => window.removeEventListener("omnimeda-product-added", handler);
  }, [refresh]);

  const totalProducts = items.length;
  const portfolioValue = items.reduce((sum, i) => sum + i.price, 0);
  const breakdown = getTypeBreakdown(items);
  const maxType = Math.max(breakdown.ebook, breakdown.audiobook, breakdown.video, 1);

  // Last 5 products sorted by createdAt descending
  const recent = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="mt-12 border-t pt-10" style={{ borderColor: "var(--color-border)" }}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
          {t("admin.analytics.title")}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("admin.analytics.desc")}
        </p>
      </div>

      {/* 4-panel grid: 2x2 on desktop, stack on mobile */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Panel 1: Total Products */}
        <PanelCard title={t("admin.analytics.totalProducts")}>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>
              {totalProducts}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("admin.analytics.allTime")}
          </p>
        </PanelCard>

        {/* Panel 2: Estimated Portfolio Value */}
        <PanelCard title={t("admin.analytics.portfolioValue")}>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
              ${portfolioValue.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("admin.analytics.basedOn")} {totalProducts} {totalProducts === 1 ? t("admin.analytics.product") : t("admin.analytics.products")}
          </p>
        </PanelCard>

        {/* Panel 3: Products by Type — pure CSS bar chart */}
        <PanelCard title={t("admin.analytics.byType")}>
          <div className="space-y-3" role="list" aria-label={t("admin.analytics.byType")}>
            {/* Ebook bar */}
            <div role="listitem">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text)" }}>{t("admin.analytics.typeEbook")}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{breakdown.ebook}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.ebook / maxType) * 100}%`, backgroundColor: "var(--color-primary)" }}
                  role="progressbar"
                  aria-valuenow={breakdown.ebook}
                  aria-valuemin={0}
                  aria-valuemax={maxType}
                  aria-label={`${t("admin.analytics.typeEbook")}: ${breakdown.ebook}`}
                />
              </div>
            </div>
            {/* Audiobook bar */}
            <div role="listitem">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text)" }}>{t("admin.analytics.typeAudiobook")}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{breakdown.audiobook}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.audiobook / maxType) * 100}%`, backgroundColor: "#f59e0b" }}
                  role="progressbar"
                  aria-valuenow={breakdown.audiobook}
                  aria-valuemin={0}
                  aria-valuemax={maxType}
                  aria-label={`${t("admin.analytics.typeAudiobook")}: ${breakdown.audiobook}`}
                />
              </div>
            </div>
            {/* Video bar */}
            <div role="listitem">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text)" }}>{t("admin.analytics.typeVideo")}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{breakdown.video}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(breakdown.video / maxType) * 100}%`, backgroundColor: "#22c55e" }}
                  role="progressbar"
                  aria-valuenow={breakdown.video}
                  aria-valuemin={0}
                  aria-valuemax={maxType}
                  aria-label={`${t("admin.analytics.typeVideo")}: ${breakdown.video}`}
                />
              </div>
            </div>
          </div>
        </PanelCard>

        {/* Panel 4: Recent Activity Timeline */}
        <PanelCard title={t("admin.analytics.recentActivity")}>
          {recent.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t("admin.analytics.noActivity")}
            </p>
          ) : (
            <ul className="space-y-3" role="list" aria-label={t("admin.analytics.recentActivity")}>
              {recent.map((item, idx) => (
                <li key={item.id} className="flex items-start gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className="mt-1.5 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: "var(--color-primary)" }}
                      aria-hidden="true"
                    />
                    {idx < recent.length - 1 && (
                      <div className="mt-0.5 w-px flex-1" style={{ backgroundColor: "var(--color-border)" }} aria-hidden="true" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      ${item.price.toFixed(2)} &middot; {formatDate(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      {/* Secondary 2-panel grid: Revenue Projection, Format Diversity Ring */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <RevenueProjectionPanel portfolioValue={portfolioValue} t={t} />
        <FormatDiversityRing breakdown={breakdown} t={t} />
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow items={items} t={t} />
    </div>
  );
}
