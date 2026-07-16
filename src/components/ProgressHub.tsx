import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getPublishedConfig,
  getCurrentPoints,
  getCurrentTier,
  getNextTier,
  getLedger,
  type LoyaltyLedgerEntry,
  type LoyaltyConfig,
  getEstimatedDollarValue,
  redeemPoints,
} from "~/data/loyalty";
import { getCatalogItems } from "~/data/catalog";

export function ProgressHub() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<LoyaltyConfig>(getPublishedConfig());
  const [points, setPoints] = useState(getCurrentPoints());
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>(getLedger());
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemMsg, setRedeemMsg] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "success" | "error">("idle");
  const [sortField, setSortField] = useState<"timestamp" | "points">("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const refresh = useCallback(() => {
    setConfig(getPublishedConfig());
    setPoints(getCurrentPoints());
    setLedger(getLedger());
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("wallet-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("wallet-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const currentTier = getCurrentTier(config);
  const nextTierInfo = getNextTier(config);

  const handleRedeem = useCallback(() => {
    const pts = parseInt(redeemAmount, 10);
    if (isNaN(pts) || pts < config.minimumRedeem) {
      setRedeemStatus("error");
      return;
    }
    const desc = redeemMsg.trim() || `Redeemed ${pts} points`;
    const success = redeemPoints(pts, desc);
    if (success) {
      setRedeemStatus("success");
      setRedeemAmount("");
      setRedeemMsg("");
      refresh();
    } else {
      setRedeemStatus("error");
    }
    setTimeout(() => setRedeemStatus("idle"), 3000);
  }, [redeemAmount, redeemMsg, config, refresh]);

  const sortedLedger = [...ledger].sort((a, b) => {
    const aVal = sortField === "timestamp" ? a.timestamp : a.points;
    const bVal = sortField === "timestamp" ? b.timestamp : b.points;
    if (sortDir === "desc") return aVal > bVal ? -1 : 1;
    return aVal < bVal ? -1 : 1;
  });

  const catalogItems = getCatalogItems();
  const totalBonus = catalogItems.reduce((sum, item) => sum + (item.promoFlatBonus ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("progress.title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("progress.subtitle")}
        </p>
      </div>

      {/* Points Hero Card */}
      <div
        className="mb-6 overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
      >
        <div className="p-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("progress.currentPoints")}
              </p>
              <p className="mt-1 text-4xl font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
                {points}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                ≈ ${getEstimatedDollarValue(points, config).toFixed(2)} {t("progress.value")}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span
                className="inline-block rounded-full px-4 py-1.5 text-sm font-bold"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)",
                  color: "var(--color-primary,#6366f1)",
                }}
              >
                {currentTier.name}
              </span>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("progress.multiplier")}: {currentTier.multiplier}x
              </p>
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div
          className="border-t px-6 py-4"
          style={{ borderColor: "var(--color-border,#334155)" }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            <span>{currentTier.name}</span>
            <span>
              {nextTierInfo.next
                ? `${nextTierInfo.pointsNeeded} ${t("progress.toNext")} ${nextTierInfo.next.name}`
                : t("progress.maxTier")}
            </span>
          </div>
          <div
            className="mt-2 h-3 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--color-bg,#0f172a)" }}
            role="progressbar"
            aria-valuenow={nextTierInfo.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("progress.tierProgress")}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${nextTierInfo.progressPercent}%`,
                backgroundColor: "var(--color-primary,#6366f1)",
              }}
            />
          </div>
          <p className="mt-1 text-right text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {nextTierInfo.progressPercent}%
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("progress.totalEarned")}
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {ledger.filter((e) => e.type !== "redeemed").reduce((s, e) => s + e.points, 0)}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("progress.totalRedeemed")}
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {ledger.filter((e) => e.type === "redeemed").reduce((s, e) => s + e.points, 0)}
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("progress.promoBonuses")}
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color: "var(--color-primary,#6366f1)" }}>
            {totalBonus > 0 ? `+${totalBonus}` : "0"}
          </p>
        </div>
      </div>

      {/* Redeem Section */}
      <div
        className="mb-6 rounded-xl border p-5"
        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
      >
        <h2 className="mb-1 text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("progress.redeemTitle")}
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("progress.redeemDesc").replace("{rate}", `${config.conversionRate} points = $1`)}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label htmlFor="redeem-amount" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("progress.redeemAmount")}
            </label>
            <input
              id="redeem-amount"
              type="number"
              min={config.minimumRedeem}
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder={t("progress.redeemMin").replace("{min}", String(config.minimumRedeem))}
              aria-label={t("progress.redeemAmount")}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="redeem-msg" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("progress.redeemDescLabel")}
            </label>
            <input
              id="redeem-msg"
              type="text"
              value={redeemMsg}
              onChange={(e) => setRedeemMsg(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder={t("progress.redeemDescPlaceholder")}
              aria-label={t("progress.redeemDescLabel")}
            />
          </div>
          <button
            type="button"
            onClick={handleRedeem}
            disabled={!redeemAmount || parseInt(redeemAmount) < config.minimumRedeem}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            aria-label={t("progress.redeemButton")}
          >
            {t("progress.redeemButton")}
          </button>
        </div>
        {redeemStatus === "success" && (
          <p className="mt-3 text-sm text-emerald-400" role="status" aria-live="polite">{t("progress.redeemSuccess")}</p>
        )}
        {redeemStatus === "error" && (
          <p className="mt-3 text-sm text-red-400" role="status" aria-live="polite">{t("progress.redeemError")}</p>
        )}
        {redeemAmount && parseInt(redeemAmount) >= config.minimumRedeem && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            ≈ ${getEstimatedDollarValue(parseInt(redeemAmount), config).toFixed(2)} {t("progress.value")}
          </p>
        )}
      </div>

      {/* Points Ledger */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("progress.ledgerTitle")} ({ledger.length})
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                if (sortField === "timestamp") setSortDir(sortDir === "desc" ? "asc" : "desc");
                else setSortField("timestamp");
                setSortDir("desc");
              }}
              className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
              style={{
                color: sortField === "timestamp" ? "var(--color-primary,#6366f1)" : "var(--color-text-muted,#94a3b8)",
                backgroundColor: sortField === "timestamp" ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "transparent",
              }}
              aria-label={t("progress.sortDate")}
            >
              {t("progress.sortDate")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (sortField === "points") setSortDir(sortDir === "desc" ? "asc" : "desc");
                else setSortField("points");
                setSortDir("desc");
              }}
              className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
              style={{
                color: sortField === "points" ? "var(--color-primary,#6366f1)" : "var(--color-text-muted,#94a3b8)",
                backgroundColor: sortField === "points" ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "transparent",
              }}
              aria-label={t("progress.sortPoints")}
            >
              {t("progress.sortPoints")}
            </button>
          </div>
        </div>

        {sortedLedger.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("progress.ledgerEmpty")}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs" role="table" aria-label={t("progress.ledgerTitle")}>
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("progress.colDate")}</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("progress.colDescription")}</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("progress.colPoints")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLedger.map((entry) => (
                    <tr key={entry.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                        {entry.description}
                        {entry.productId && (
                          <span className="ml-1 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                            ({entry.productId.slice(0, 8)})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap"
                        style={{ color: entry.type === "redeemed" ? "#f87171" : "#34d399" }}
                      >
                        {entry.type === "redeemed" ? "-" : "+"}{entry.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {sortedLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-bold" style={{ color: entry.type === "redeemed" ? "#f87171" : "#34d399" }}>
                      {entry.type === "redeemed" ? "-" : "+"}{entry.points}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}