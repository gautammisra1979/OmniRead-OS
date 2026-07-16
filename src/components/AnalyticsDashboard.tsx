import { useState, useEffect, useCallback } from "react";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";
import { useLanguage } from "~/components/LanguageProvider";

/* ------------------------------------------------------------------ */
/*  localStorage analytics log helpers                                 */
/* ------------------------------------------------------------------ */

const ANALYTICS_LOG_KEY = "omnimedos_analytics_log";

interface AnalyticsEvent {
  date: string; // YYYY-MM-DD
  count: number;
}

function getAnalyticsLog(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANALYTICS_LOG_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function recordProductAdded(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const log = getAnalyticsLog();
  const existing = log.find((e) => e.date === today);
  if (existing) {
    existing.count += 1;
  } else {
    log.push({ date: today, count: 1 });
  }
  localStorage.setItem(ANALYTICS_LOG_KEY, JSON.stringify(log));
}

function getTrend(): "up" | "down" | "flat" {
  const log = getAnalyticsLog();
  if (log.length < 2) return "flat";
  const sorted = log.sort((a, b) => a.date.localeCompare(b.date));
  const today = sorted[sorted.length - 1].count;
  const yesterday = sorted[sorted.length - 2].count;
  if (today > yesterday) return "up";
  if (today < yesterday) return "down";
  return "flat";
}

/** Build a 7-day activity array for the sparkline */
function get7DayActivity(): { label: string; count: number }[] {
  const log = getAnalyticsLog();
  const days: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const match = log.find((e) => e.date === dateStr);
    days.push({ label: dayLabel, count: match?.count ?? 0 });
  }
  return days;
}

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

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 015.306 6.324l.428 2.045a.75.75 0 001.47-.277l-.428-2.045a11.959 11.959 0 00-5.883-7.614l-2.74-1.22m0 0l-5.94 2.28m5.94-2.28l2.28 5.94" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776l.5-.5a.75.75 0 011.06 0l2.94 2.94a.75.75 0 001.06 0l2.94-2.94a.75.75 0 011.06 0l2.94 2.94a.75.75 0 001.06 0l2.94-2.94a.75.75 0 011.06 0l.5.5" />
    </svg>
  );
}

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
/*  7-Day Activity Sparkline (Pure SVG)                                */
/* ------------------------------------------------------------------ */

function SparklinePanel({ activity, t }: { activity: { label: string; count: number }[]; t: (k: string) => string }) {
  const maxCount = Math.max(...activity.map((d) => d.count), 1);
  const width = 240;
  const height = 60;
  const padding = 4;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  if (activity.length < 2) {
    return (
      <PanelCard title={t("admin.analytics.sparkline")}>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.analytics.noActivity")}</p>
      </PanelCard>
    );
  }

  const points = activity.map((d, i) => {
    const x = padding + (i / (activity.length - 1)) * chartW;
    const y = padding + chartH - (d.count / maxCount) * chartH;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");

  // Trend vs last week: compare first half vs second half
  const mid = Math.floor(activity.length / 2);
  const firstHalf = activity.slice(0, mid).reduce((s, d) => s + d.count, 0);
  const secondHalf = activity.slice(mid).reduce((s, d) => s + d.count, 0);
  let trendArrow: "up" | "down" | "flat" = "flat";
  if (secondHalf > firstHalf) trendArrow = "up";
  else if (secondHalf < firstHalf) trendArrow = "down";

  return (
    <PanelCard title={t("admin.analytics.sparkline")}>
      <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {t("admin.analytics.sparklineDesc")}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height + 18}`}
        className="w-full"
        role="img"
        aria-label={t("admin.analytics.sparklineDesc")}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((fraction, idx) => {
          const y = padding + chartH - fraction * chartH;
          return (
            <line
              key={idx}
              x1={padding}
              y1={y}
              x2={padding + chartW}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={0.5}
              strokeDasharray="2,2"
              aria-hidden="true"
            />
          );
        })}
        {/* Area fill under the line */}
        <polygon
          points={`${padding},${padding + chartH} ${polylinePoints} ${padding + chartW},${padding + chartH}`}
          fill="var(--color-primary)"
          fillOpacity={0.1}
          aria-hidden="true"
        />
        {/* The sparkline */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        />
        {/* Data dots */}
        {activity.map((d, i) => {
          const x = padding + (i / (activity.length - 1)) * chartW;
          const y = padding + chartH - (d.count / maxCount) * chartH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2.5}
              fill="var(--color-primary)"
              stroke="var(--color-bg)"
              strokeWidth={1}
              aria-hidden="true"
            />
          );
        })}
        {/* Day labels */}
        {activity.map((d, i) => {
          const x = padding + (i / (activity.length - 1)) * chartW;
          return (
            <text
              key={i}
              x={x}
              y={height + 10}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={8}
              aria-hidden="true"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      {/* Trend indicator */}
      <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <TrendIcon trend={trendArrow} />
        <span>
          {trendArrow === "up"
            ? "↑"
            : trendArrow === "down"
              ? "↓"
              : "→"}{" "}
          {t("admin.analytics.vsLastWeek")}
        </span>
      </div>
    </PanelCard>
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
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");

  const refresh = useCallback(() => {
    setItems(getCatalogItems());
    setTrend(getTrend());
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
      recordProductAdded();
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

  // 7-day activity data
  const activity = get7DayActivity();

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
            <TrendIcon trend={trend} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {trend === "up"
                ? t("admin.analytics.trendUp")
                : trend === "down"
                  ? t("admin.analytics.trendDown")
                  : t("admin.analytics.trendFlat")}
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

      {/* Secondary 3-panel grid: Sparkline, Revenue Projection, Format Diversity Ring */}
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <SparklinePanel activity={activity} t={t} />
        <RevenueProjectionPanel portfolioValue={portfolioValue} t={t} />
        <FormatDiversityRing breakdown={breakdown} t={t} />
      </div>

      {/* Quick Stats Row */}
      <QuickStatsRow items={items} t={t} />
    </div>
  );
}
