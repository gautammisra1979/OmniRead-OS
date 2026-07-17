import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getUpsellOffers, saveUpsellOffers, generateUpsellOffers, getMembershipPlans, saveMembershipPlans, upgradeMembership, getUserMembership, type MembershipPlan, type MembershipTier } from "~/data/membership";
import { getCatalogItems, type CatalogItem } from "~/data/catalog";

export function CheckoutUpsells() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState(getUpsellOffers());
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const generated = generateUpsellOffers();
    if (generated.length > 0) {
      setOffers(generated);
      saveUpsellOffers(generated);
    }
  }, []);

  const handleAccept = useCallback((id: string) => {
    setAcceptedIds((prev) => new Set(prev).add(id));
  }, []);

  if (offers.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
        <h3 className="mb-4 text-base font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("upsell.title") ?? "Complete Your Experience"}
        </h3>
        <p className="mb-4 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("upsell.desc") ?? "Add these items to your order at a special discount!"}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {offers.map((offer) => (
            <div key={offer.productId} className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <div className="mb-2 flex items-center justify-center h-20 rounded-lg" style={{ backgroundColor: "var(--color-surface,#1e293b)" }}>
                {offer.image ? (
                  <img src={offer.image} alt={offer.title} className="h-full w-full object-contain rounded" />
                ) : (
                  <span className="text-3xl">📦</span>
                )}
              </div>
              <h4 className="text-sm font-semibold truncate" style={{ color: "var(--color-text,#f8fafc)" }}>
                {offer.title}
              </h4>
              <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{offer.format}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
                  ${(offer.price * (1 - offer.discountPercent / 100)).toFixed(2)}
                </span>
                <span className="text-xs line-through" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  ${offer.price.toFixed(2)}
                </span>
                <span className="rounded-full bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                  -{offer.discountPercent}%
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAccept(offer.productId)}
                disabled={acceptedIds.has(offer.productId)}
                className="mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: acceptedIds.has(offer.productId) ? "#059669" : "var(--color-primary,#6366f1)" }}
              >
                {acceptedIds.has(offer.productId) ? (t("upsell.added") ?? "Added ✓") : (t("upsell.add") ?? "Add to Order")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Membership Plans Config (Admin) ─── */

export function MembershipConfigSection() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState<MembershipPlan[]>(getMembershipPlans());
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    saveMembershipPlans(plans);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [plans]);

  const handlePlanChange = useCallback((idx: number, field: keyof MembershipPlan, value: string | number | boolean) => {
    setPlans((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("membership.title") ?? "Membership & Subscription Plans"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("membership.desc") ?? "Configure subscription tiers, pricing, and feature access."}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {t("common.save") ?? "Plans saved!"}
        </div>
      )}

      <div className="space-y-4">
        {plans.map((plan, idx) => (
          <div key={plan.id} className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {plan.name}
              </h3>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase" style={{
                backgroundColor: plan.tier === "free" ? "color-mix(in srgb, #94a3b8 20%, transparent)" : "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)",
                color: plan.tier === "free" ? "#94a3b8" : "var(--color-primary,#6366f1)",
              }}>
                {plan.tier}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("membership.price") ?? "Monthly Price ($)"}
                </label>
                <input type="number" min={0} step={0.01} value={plan.price}
                  onChange={(e) => handlePlanChange(idx, "price", parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("membership.storageLimit") ?? "Storage Limit (MB)"}
                </label>
                <input type="number" min={0} value={plan.storageLimit}
                  onChange={(e) => handlePlanChange(idx, "storageLimit", parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                <input type="checkbox" checked={plan.allowLibrarian} onChange={(e) => handlePlanChange(idx, "allowLibrarian", e.target.checked)} />
                {t("membership.allowLibrarian") ?? "AI Librarian"}
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                <input type="checkbox" checked={plan.allowChallenge} onChange={(e) => handlePlanChange(idx, "allowChallenge", e.target.checked)} />
                {t("membership.allowChallenge") ?? "Challenge"}
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                <input type="checkbox" checked={plan.allowDownloads} onChange={(e) => handlePlanChange(idx, "allowDownloads", e.target.checked)} />
                {t("membership.allowDownloads") ?? "Downloads"}
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                <input type="checkbox" checked={plan.allowAffiliate} onChange={(e) => handlePlanChange(idx, "allowAffiliate", e.target.checked)} />
                {t("membership.allowAffiliate") ?? "Affiliate"}
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-6 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
        style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
      >
        {t("common.save") ?? "Save Plans"}
      </button>
    </div>
  );
}

/* ─── Catalog Access Control Admin ─── */

export function CatalogAccessControl() {
  const { t } = useLanguage();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setItems(getCatalogItems());
  }, []);

  const handleToggle = useCallback((idx: number, field: "allowLibrarian" | "allowChallenge") => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: !next[idx][field] };
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("omnimedos_catalog", JSON.stringify(items));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("catalog.empty") ?? "No catalog items yet. Add products to configure access control."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
      <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("catalog.accessControl") ?? "Catalog Access Control"}
      </h3>
      <p className="mb-4 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("catalog.accessDesc") ?? "Enable or disable AI Librarian and Challenge access per product."}
      </p>

      {saved && (
        <div className="mb-3 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {t("common.save") ?? "Access settings saved!"}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
              <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("catalog.title") ?? "Product"}</th>
              <th className="px-3 py-2 font-medium text-center" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("membership.allowLibrarian") ?? "AI Librarian"}</th>
              <th className="px-3 py-2 font-medium text-center" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("membership.allowChallenge") ?? "Challenge"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {item.title}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.allowLibrarian ?? true}
                    onChange={() => handleToggle(idx, "allowLibrarian")}
                    aria-label={`Allow Librarian for ${item.title}`}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={item.allowChallenge ?? true}
                    onChange={() => handleToggle(idx, "allowChallenge")}
                    aria-label={`Allow Challenge for ${item.title}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
        style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
      >
        {t("common.save") ?? "Save Access Settings"}
      </button>
    </div>
  );
}