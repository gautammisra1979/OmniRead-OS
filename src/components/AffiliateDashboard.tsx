import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getAffiliateProfile,
  getAffiliateLedger,
  getClicks,
  getTotalClicks,
  getConversionRate,
  getUnpaidEarnings,
  getTotalPaidOut,
  getTotalEarnings,
  saveAffiliateProfile,
  type AffiliateProfile,
  type AffiliateLedgerEntry,
} from "~/data/affiliate";

export function AffiliateDashboard() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<AffiliateProfile | null>(getAffiliateProfile());
  const [ledger, setLedger] = useState<AffiliateLedgerEntry[]>([]);
  const [clicks, setClicks] = useState(0);
  const [conversion, setConversion] = useState(0);
  const [unpaid, setUnpaid] = useState(0);
  const [paidOut, setPaidOut] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "venmo" | "crypto">(profile?.paymentMethod ?? "paypal");
  const [paymentDetail, setPaymentDetail] = useState(profile?.paymentDetail ?? "");
  const [saved, setSaved] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "paid">("all");

  const refresh = useCallback(() => {
    const p = getAffiliateProfile();
    setProfile(p);
    setLedger(getAffiliateLedger());
    if (p) {
      setClicks(getTotalClicks(p.handle));
      setConversion(getConversionRate(p.handle));
      setUnpaid(getUnpaidEarnings(p.handle));
      setPaidOut(getTotalPaidOut(p.handle));
      setTotalEarned(getTotalEarnings(p.handle));
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [refresh]);

  const handleSavePayment = useCallback(() => {
    if (!profile) return;
    saveAffiliateProfile({ ...profile, paymentMethod, paymentDetail });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }, [profile, paymentMethod, paymentDetail, refresh]);

  if (!profile) return null;

  const filteredLedger = statusFilter === "all"
    ? ledger
    : ledger.filter((e) => e.status === statusFilter);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "var(--color-text-muted,#94a3b8)",
      approved: "#fbbf24",
      paid: "#34d399",
    };
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "color-mix(in srgb, " + (colors[status] ?? "#94a3b8") + " 20%, transparent)", color: colors[status] ?? "#94a3b8" }}>
        {status === "pending" ? t("affiliate.statusPending") : status === "approved" ? t("affiliate.statusApproved") : t("affiliate.statusPaid")}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header with edit */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            @{profile.handle}
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {profile.brandName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowEdit(!showEdit)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            color: "var(--color-text-muted,#94a3b8)",
            border: "1px solid var(--color-border,#334155)",
          }}
        >
          {showEdit ? t("affiliate.hideEdit") : t("affiliate.editProfile")}
        </button>
      </div>

      {/* Edit Profile Section */}
      {showEdit && (
        <div className="mb-6 rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.paymentMethod")}
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[120px]">
              <label htmlFor="dash-payment" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.paymentMethod")}
              </label>
              <select
                id="dash-payment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "paypal" | "venmo" | "crypto")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              >
                <option value="paypal">{t("affiliate.paypal")}</option>
                <option value="venmo">{t("affiliate.venmo")}</option>
                <option value="crypto">{t("affiliate.crypto")}</option>
              </select>
            </div>
            <div className="flex-[2] min-w-[160px]">
              <label htmlFor="dash-payment-detail" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("affiliate.paymentPlaceholder")}
              </label>
              <input
                id="dash-payment-detail"
                type="text"
                value={paymentDetail}
                onChange={(e) => setPaymentDetail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                placeholder="email@example.com"
              />
            </div>
            <button
              type="button"
              onClick={handleSavePayment}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {saved ? t("affiliate.saved") : t("affiliate.savePayment")}
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.totalClicks")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {clicks}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.conversionRate")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {conversion}%
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.owed")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#fbbf24" }}>
            ${unpaid.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.paidOut")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#34d399" }}>
            ${paidOut.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Sales History Ledger */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.ledger")} ({ledger.length})
          </h3>
          <div className="flex gap-1">
            {(["all", "pending", "approved", "paid"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
                style={{
                  color: statusFilter === f ? "var(--color-primary,#6366f1)" : "var(--color-text-muted,#94a3b8)",
                  backgroundColor: statusFilter === f ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "transparent",
                }}
              >
                {f === "all" ? "All" : f === "pending" ? t("affiliate.statusPending") : f === "approved" ? t("affiliate.statusApproved") : t("affiliate.statusPaid")}
              </button>
            ))}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("affiliate.noActivity")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Date</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Book</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Value</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Commission</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.bookTitle}</td>
                      <td className="px-3 py-2 text-right" style={{ color: "var(--color-text,#f8fafc)" }}>${entry.purchaseValue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: "#34d399" }}>${entry.commissionSlice.toFixed(2)}</td>
                      <td className="px-3 py-2">{statusBadge(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {filteredLedger.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                    {statusBadge(entry.status)}
                  </div>
                  <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.bookTitle}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      ${entry.purchaseValue.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#34d399" }}>
                      +${entry.commissionSlice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}