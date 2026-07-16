import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getRefundClaims,
  approveRefundClaim,
  rejectRefundClaim,
  getClaimCounts,
  type RefundClaim,
} from "~/data/refunds";
import { getCurrentPoints, addLedgerEntry } from "~/data/loyalty";
import { markTransactionRefunded } from "~/data/stripeCheckout";

export function RefundClaimsManager() {
  const { t } = useLanguage();
  const [claims, setClaims] = useState<RefundClaim[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [restorePoints, setRestorePoints] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const refresh = useCallback(() => {
    setClaims(getRefundClaims());
    setCounts(getClaimCounts());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleApprove = useCallback((claim: RefundClaim) => {
    const result = approveRefundClaim(claim.id, adminNotes || undefined);
    if (result) {
      // Restore loyalty points if toggle is on
      if (restorePoints && claim.refundLoyaltyPoints > 0) {
        addLedgerEntry({
          type: "bonus",
          points: claim.refundLoyaltyPoints,
          description: `Refund restoration for "${claim.productTitle}"`,
        });
      }
      // Mark Stripe transaction as refunded
      markTransactionRefunded(claim.transactionId);
      setAdminNotes("");
      refresh();
      setStatusMsg({ type: "success", text: `Refund approved for "${claim.productTitle}"${restorePoints && claim.refundLoyaltyPoints > 0 ? ` — ${claim.refundLoyaltyPoints} points restored` : ""}` });
    }
  }, [restorePoints, adminNotes, refresh]);

  const handleReject = useCallback((claim: RefundClaim) => {
    const result = rejectRefundClaim(claim.id, adminNotes || undefined);
    if (result) {
      setAdminNotes("");
      refresh();
      setStatusMsg({ type: "success", text: `Refund rejected for "${claim.productTitle}"` });
    }
  }, [adminNotes, refresh]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 50%, transparent)" }}>
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, #ef4444 20%, transparent)" }} aria-hidden="true">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m-18 0h.375c.621 0 1.125-.504 1.125-1.125V7.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("checkout.refundManagerTitle")}</h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.refundManagerDesc")}</p>
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${statusMsg.type === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`} role="status" aria-live="polite">
            {statusMsg.text}
          </div>
        )}

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
            <p className="text-lg font-bold text-amber-400">{counts.pending}</p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.pending")}</p>
          </div>
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
            <p className="text-lg font-bold text-emerald-400">{counts.approved}</p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.approved")}</p>
          </div>
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
            <p className="text-lg font-bold text-red-400">{counts.rejected}</p>
            <p className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.rejected")}</p>
          </div>
        </div>

        {/* Toggle: restore points */}
        <label className="mb-4 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={restorePoints} onChange={(e) => setRestorePoints(e.target.checked)} className="rounded" />
          <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.restorePointsToggle")}</span>
        </label>

        {/* Admin notes input */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("checkout.adminNotes")}
          </label>
          <input
            type="text"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-xs"
            style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            placeholder="Optional admin notes..."
          />
        </div>

        {/* Claims table */}
        {claims.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("checkout.noClaims")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                  <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.product")}</th>
                  <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.reason")}</th>
                  <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.date")}</th>
                  <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.points")}</th>
                  <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.status")}</th>
                  <th className="px-2 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("checkout.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <td className="px-2 py-2 max-w-[150px] truncate" style={{ color: "var(--color-text,#f8fafc)" }}>{claim.productTitle}</td>
                    <td className="px-2 py-2 max-w-[200px] truncate" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{claim.reason}</td>
                    <td className="px-2 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{formatDate(claim.requestedAt)}</td>
                    <td className="px-2 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{claim.refundLoyaltyPoints}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        claim.status === "pending" ? "bg-amber-900/30 text-amber-400" :
                        claim.status === "approved" ? "bg-emerald-900/30 text-emerald-400" :
                        "bg-red-900/30 text-red-400"
                      }`}>
                        {claim.status === "pending" ? t("checkout.pending") :
                         claim.status === "approved" ? t("checkout.approved") :
                         t("checkout.rejected")}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {claim.status === "pending" ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleApprove(claim)}
                            className="rounded px-2 py-1 text-[10px] font-semibold text-white hover:brightness-110"
                            style={{ backgroundColor: "#10b981" }}
                          >
                            {t("checkout.approve")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(claim)}
                            className="rounded px-2 py-1 text-[10px] font-semibold text-white hover:brightness-110"
                            style={{ backgroundColor: "#ef4444" }}
                          >
                            {t("checkout.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                          {claim.resolvedAt ? formatDate(claim.resolvedAt) : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}