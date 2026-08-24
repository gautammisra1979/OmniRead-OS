import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getMyAffiliateProfile,
  getMyAffiliateLedger,
  getMyClickCount,
  updateAffiliateProfile,
  type AffiliateProfileRow,
  type AffiliateLedgerRow,
  type LedgerDisplayStatus,
} from "~/data/affiliateProgram";

type LedgerRow = AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus };

const STATUS_FILTERS = ["all", "in_hold", "payable", "paid", "converted", "voided"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<LedgerDisplayStatus, string> = {
  in_hold: "In Hold",
  payable: "Payable",
  paid: "Paid",
  converted: "Converted",
  voided: "Voided",
};

const STATUS_COLORS: Record<LedgerDisplayStatus, string> = {
  in_hold: "var(--color-text-muted,#94a3b8)",
  payable: "#fbbf24",
  paid: "#34d399",
  converted: "#818cf8",
  voided: "#f87171",
};

function sumByStatus(ledger: LedgerRow[], status: LedgerDisplayStatus): number {
  return ledger
    .filter((e) => e.displayStatus === status)
    .reduce((sum, e) => sum + Number(e.commissionSlice), 0);
}

export function AffiliateDashboard() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AffiliateProfileRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [clicks, setClicks] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "venmo" | "crypto">("paypal");
  const [paymentDetail, setPaymentDetail] = useState("");
  const [payoutPreference, setPayoutPreference] = useState<"cash" | "loyalty_credit">("cash");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const refresh = useCallback(async () => {
    const [p, l, c] = await Promise.all([getMyAffiliateProfile(), getMyAffiliateLedger(), getMyClickCount()]);
    setProfile(p);
    setLedger(l);
    setClicks(c);
    if (p) {
      setPaymentMethod(p.paymentMethod as "paypal" | "venmo" | "crypto");
      setPaymentDetail(p.paymentDetail);
      setPayoutPreference(p.payoutPreference as "cash" | "loyalty_credit");
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleSavePayment = useCallback(async () => {
    setSaving(true);
    await updateAffiliateProfile({ paymentMethod, paymentDetail, payoutPreference });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await refresh();
  }, [paymentMethod, paymentDetail, payoutPreference, refresh]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-10 text-center">
        <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Loading…</p>
      </div>
    );
  }

  if (!profile) return null;

  const filteredLedger = statusFilter === "all" ? ledger : ledger.filter((e) => e.displayStatus === statusFilter);

  const payable = sumByStatus(ledger, "payable");
  const inHold = sumByStatus(ledger, "in_hold");
  const paidOut = sumByStatus(ledger, "paid");
  const converted = sumByStatus(ledger, "converted");

  const statusBadge = (status: LedgerDisplayStatus) => (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[status]} 20%, transparent)`, color: STATUS_COLORS[status] }}
    >
      {STATUS_LABELS[status]}
    </span>
  );

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
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="dash-payout-pref" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Payout Preference
              </label>
              <select
                id="dash-payout-pref"
                value={payoutPreference}
                onChange={(e) => setPayoutPreference(e.target.value as "cash" | "loyalty_credit")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              >
                <option value="cash">Cash</option>
                <option value="loyalty_credit">Loyalty Credit</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleSavePayment}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {saved ? t("affiliate.saved") : saving ? "..." : t("affiliate.savePayment")}
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("affiliate.totalClicks")}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {clicks}
          </p>
          {/* Referral-capture-only: counts clicks through this affiliate's
              own storefront link, not full site-wide click instrumentation. */}
          <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            via referral link
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            Payable
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#fbbf24" }}>
            ${payable.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            In Hold Period
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            ${inHold.toFixed(2)}
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
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            Converted to Loyalty
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: "#818cf8" }}>
            ${converted.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Sales History Ledger */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)" }}>
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("affiliate.ledger")} ({ledger.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => (
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
                {f === "all" ? "All" : STATUS_LABELS[f]}
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
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.productTitle}</td>
                      <td className="px-3 py-2 text-right" style={{ color: "var(--color-text,#f8fafc)" }}>${Number(entry.purchaseValue).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: "#34d399" }}>${Number(entry.commissionSlice).toFixed(2)}</td>
                      <td className="px-3 py-2">{statusBadge(entry.displayStatus)}</td>
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
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    {statusBadge(entry.displayStatus)}
                  </div>
                  <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.productTitle}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      ${Number(entry.purchaseValue).toFixed(2)}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#34d399" }}>
                      +${Number(entry.commissionSlice).toFixed(2)}
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
