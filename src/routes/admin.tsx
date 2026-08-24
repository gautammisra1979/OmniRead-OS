import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminLogin } from "~/components/AdminLogin";
import { FeatureSwitchboard } from "~/components/FeatureSwitchboard";
import { AnalyticsDashboard } from "~/components/AnalyticsDashboard";
import { useLanguage } from "~/components/LanguageProvider";
import { defaultQuiz, type QuizQuestion } from "~/data/defaultQuiz";
import { getWallet, addCredits, getCostPer1K, saveCostPer1K, type WalletState } from "~/data/wallet";
import {
  getKnowledgeBase,
  saveKnowledgeRow,
  deleteKnowledgeRow,
  upsertKnowledgeRows,
  generateKnowledgeRowId,
  type KnowledgeRow,
  type KnowledgeType,
  KNOWLEDGE_TYPES,
} from "~/data/knowledgeBase";
import {
  getDraftConfig,
  saveDraftConfig,
  publishConfig,
  getPublishedConfig,
  hasPublishedConfig,
  type LoyaltyConfig,
  type LoyaltyTier,
} from "~/data/loyalty";
import {
  getAllAffiliateProfiles,
  getAffiliateLedgerForAdmin,
  getPayoutHistory,
  getPayableSummary,
  settleAffiliatePayout,
  type AffiliateProfileRow,
  type AffiliateLedgerRow,
  type AffiliatePayoutRow,
  type LedgerDisplayStatus,
  type PayableSummaryRow,
} from "~/data/affiliateProgram";
import {
  getAffiliateSettings,
  saveAffiliateSettings,
  DEFAULT_AFFILIATE_SETTINGS,
  type AffiliateSettings,
} from "~/data/affiliateSettings";
import {
  getPromoSettings,
  savePromoSettings,
  calculateDiscountedPrice,
  DEFAULT_PROMO_SETTINGS,
  type PromoSettings,
  type PromoOverride,
} from "~/data/promotions";
import {
  getCommentsForProduct,
  deleteComment,
  getProductsWithComments,
  type Comment,
} from "~/data/comments";
import {
  getLicenseTier,
  setLicenseTier,
  type LicenseTier,
} from "~/data/licensing";
import { getRecoveryKey, logoutAdmin } from "~/data/adminRecovery";
import { checkIsAdmin } from "~/lib/checkIsAdmin";
import { dispatchLicenseChange } from "~/components/LicenseGate";
import { authClient } from "~/lib/auth-client";
import { OffboardingCenter } from "~/components/OffboardingCenter";
import { RefundClaimsManager } from "~/components/RefundClaimsManager";
import { PlatformFactoryReset } from "~/components/PlatformFactoryReset";
import { StorageConsole } from "~/components/StorageConsole";
import { StyleCustomizer, AnnouncementConfigSection } from "~/components/StyleCustomizer";
import { MembershipConfigSection, CatalogAccessControl } from "~/components/CheckoutUpsells";
import { DisclaimerConfigSection, InfoModalConfigSection } from "~/components/DisclaimerModal";
import { getCatalogItems, updateCatalogStatus, updateCatalogRating, type CatalogItem, type CatalogStatus } from "~/data/catalog";
import {
  getActiveLayout,
  setActiveLayout,
  getFeaturedProductId,
  setFeaturedProductId,
  type LayoutType,
} from "~/data/layoutMatrix";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  // Whether the current request carries a real Better Auth session whose
  // email matches ADMIN_EMAIL / ADMIN_EMAIL_BACKUP — checked server-side
  // via checkIsAdmin() (src/lib/requireAdmin.ts), since admin status is
  // computed live from env vars, not a client-readable field on the
  // session. Pending while either check is in flight. This is
  // authoritative and checked before the sessionStorage flag below: a
  // client-side flag alone must never be enough to reach the dashboard.
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [hasAdminSession, setHasAdminSession] = useState(false);
  const [adminCheckPending, setAdminCheckPending] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    if (sessionPending) return;
    if (!session?.user) {
      setHasAdminSession(false);
      setAdminCheckPending(false);
      return;
    }
    let cancelled = false;
    setAdminCheckPending(true);
    checkIsAdmin().then((isAdmin) => {
      if (cancelled) return;
      setHasAdminSession(isAdmin);
      setAdminCheckPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionPending, session?.user]);

  useEffect(() => {
    if (!hasAdminSession) return;
    const auth = sessionStorage.getItem("omnimeda_admin_auth");
    if (auth === "true") setAuthenticated(true);
  }, [hasAdminSession]);

  const handleAuth = () => {
    // sessionStorage is a UI-only convenience so this component can
    // instantly show the dashboard — it is NOT the security boundary.
    // The Better Auth session cookie is what every admin-mutating server
    // function actually checks via requireAdmin().
    sessionStorage.setItem("omnimeda_admin_auth", "true");
    setAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("omnimeda_admin_auth");
    setAuthenticated(false);
    // authClient.signOut() clears the real Better Auth session cookie —
    // the actual security boundary requireAdmin() checks. logoutAdmin()
    // also clears the legacy HMAC-cookie; nothing reads that cookie
    // anymore, but clearing it too is harmless.
    authClient.signOut();
    logoutAdmin();
  };

  if (sessionPending || adminCheckPending) {
    return null;
  }

  if (!hasAdminSession) {
    return <AdminLogin onAuthenticated={handleAuth} />;
  }

  if (!authenticated) {
    return <AdminLogin onAuthenticated={handleAuth} />;
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* Admin header */}
      <div className="border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "color-mix(in srgb, var(--color-surface) 50%, transparent)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm" style={{ backgroundColor: "var(--color-primary)" }}>
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold" style={{ color: "var(--color-text)" }}>{t("admin.title")}</h1>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("admin.subtitle")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            aria-label="Logout of admin panel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            {t("admin.logout")}
          </button>
        </div>
      </div>

      {/* License Tier Setting */}
      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
        <LicenseTierSection />
      </div>

      <FeatureSwitchboard />

      {/* Analytics Dashboard */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnalyticsDashboard />
      </div>

      {/* Quiz Tag Reference Accordion */}
      <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("quiz.tagReference")}
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          Reference all valid quiz tags organized by category for catalog tagging.
        </p>
        <div className="space-y-3">
          {defaultQuiz.map((q) => (
            <QuizAccordion key={q.id} question={q} />
          ))}
        </div>
      </div>

      {/* Librarian Control Engine */}
      <LibrarianControlSection />

      {/* Loyalty Rewards Configuration */}
      <LoyaltyConfigSection />

      {/* Affiliate Payroll & Management */}
      <AffiliateAdminSection />

      {/* Promotions & Discounts */}
      <PromotionsAdminSection />

      {/* Comment Moderation */}
      <CommentModerationSection />

      {/* Catalog Status Management */}
      <CatalogStatusManagement />

      {/* Storefront Layout Settings */}
      <StorefrontLayoutSettings />

      {/* Storefront Style Customizer */}
      <StyleCustomizer />
      <AnnouncementConfigSection />

      {/* Membership & Catalog Control */}
      <MembershipConfigSection />
      <CatalogAccessControl />
      <DisclaimerConfigSection />
      <InfoModalConfigSection />

      {/* Offboarding Control Center */}
      <OffboardingCenter />

      {/* Refund & Claims Manager */}
      <RefundClaimsManager />

      {/* Storage & Sync Console */}
      <div className="mt-12 border-t border-[var(--color-border,#334155)] pt-10">
        <StorageConsole />
      </div>

      {/* Recovery Key */}
      <RecoveryKeySection />

      {/* Platform Factory Reset */}
      <PlatformFactoryReset />
    </div>
  );
}

function QuizAccordion({ question }: { question: QuizQuestion }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const columnLabels: Record<string, string> = {
    quiz_mood: "Mood",
    quiz_format: "Format",
    quiz_hook: "Hook/Setting",
    quiz_pace: "Pace/Investment",
  };

  return (
    <div className="overflow-hidden rounded-xl border transition-all" style={{ borderColor: "var(--color-border,#334155)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: "var(--color-surface,#1e293b)/30" }}
        aria-expanded={open}
        aria-label={`${question.question} — ${columnLabels[question.column] ?? question.column}`}
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {columnLabels[question.column] ?? question.column}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{question.question}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("quiz.column").replace("{name}", question.column)}
          </p>
        </div>
        <svg className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-muted,#94a3b8)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t px-5 py-4" style={{ borderColor: "var(--color-border,#334155)" }}>
          <div className="flex flex-wrap gap-2">
            {question.options.map((opt) => (
              <span key={opt.tag} className="rounded-md border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg)", color: "var(--color-text,#f8fafc)" }}>
                {opt.tag}
                <span className="ml-1.5 opacity-60" style={{ color: "var(--color-text-muted,#94a3b8)" }}>— {opt.text}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Recovery Key ─── */

function RecoveryKeySection() {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const [masterKey, setMasterKey] = useState("");
  const [error, setError] = useState("");

  // getRecoveryKey() calls requireAdmin() server-side — this is the actual
  // security boundary. The sessionStorage flag that gates whether this
  // section even renders is a client-side UI convenience only; if the
  // signed session cookie has expired or is missing, this call rejects
  // regardless of what the local admin UI thinks its auth state is.
  const handleReveal = useCallback(async () => {
    setError("");
    try {
      const key = await getRecoveryKey();
      setMasterKey(key ?? "");
      setRevealed(true);
    } catch {
      setError("Your admin session has expired or is invalid — please log out and back in.");
    }
  }, []);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("admin.recovery.key") ?? "Master Recovery Key"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        View the 12-word phrase used to reset admin credentials.
      </p>
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        {!revealed ? (
          <>
            <button
              type="button"
              onClick={handleReveal}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("admin.recovery.showKey") ?? "Show Master Recovery Key"}
            </button>
            {error && (
              <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("admin.recovery.key") ?? "Your Master Recovery Key:"}
            </p>
            <p className="text-sm font-mono leading-relaxed break-all" style={{ color: "var(--color-primary,#6366f1)" }}>
              {masterKey}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Librarian Control Engine ─── */

function LibrarianControlSection() {
  const { t } = useLanguage();
  const [cost, setCost] = useState(0.01);
  const [wallet, setWallet] = useState<WalletState>({ credits: 0, totalPurchased: 0, totalConsumed: 0, refillPrice: 0 });
  const [freeAmount, setFreeAmount] = useState("100");
  const [kbRows, setKbRows] = useState<KnowledgeRow[]>([]);
  const [kbRefresh, setKbRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBookId, setNewBookId] = useState("");
  const [newType, setNewType] = useState<KnowledgeType>("theme");
  const [newMarker, setNewMarker] = useState("");
  const [newContent, setNewContent] = useState("");
  const [csvSummary, setCsvSummary] = useState<{ success: number; errors: string[] } | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getKnowledgeBase().then(setKbRows); }, [kbRefresh]);

  useEffect(() => {
    getCostPer1K().then(setCost);
    getWallet().then(setWallet);
    const handler = () => { getWallet().then(setWallet); };
    window.addEventListener("wallet-updated", handler);
    return () => window.removeEventListener("wallet-updated", handler);
  }, []);

  const handleCostChange = useCallback((val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0 && n <= 0.05) { setCost(n); saveCostPer1K(n); }
  }, []);

  const handleFreeCredits = useCallback(() => {
    const amount = parseInt(freeAmount, 10);
    if (!isNaN(amount) && amount > 0) addCredits(amount);
  }, [freeAmount]);

  const handleAddRow = useCallback(async () => {
    if (!newBookId.trim() || !newMarker.trim() || !newContent.trim()) return;
    await saveKnowledgeRow({ id: generateKnowledgeRowId(), book_id: newBookId.trim(), knowledge_type: newType, marker_reference: newMarker.trim(), content_body: newContent.trim() });
    setNewBookId(""); setNewMarker(""); setNewContent(""); setShowAddForm(false);
    setKbRefresh((r) => r + 1);
  }, [newBookId, newType, newMarker, newContent]);

  const handleDeleteRow = useCallback(async (id: string) => { await deleteKnowledgeRow(id); setKbRefresh((r) => r + 1); }, []);

  const handleCsvFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const requiredHeaders = ["book_id", "knowledge_type", "marker_reference", "content_body"];
      const hasAll = requiredHeaders.every((h) => headers.includes(h));
      if (!hasAll) { setCsvSummary({ success: 0, errors: ["Missing required headers"] }); return; }
      const rows: KnowledgeRow[] = []; const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        if (vals.length < 4) continue;
        if (!KNOWLEDGE_TYPES.includes(vals[1] as KnowledgeType)) { errors.push(`Row ${i + 1}: invalid type '${vals[1]}'`); continue; }
        rows.push({ id: generateKnowledgeRowId(), book_id: vals[0], knowledge_type: vals[1] as KnowledgeType, marker_reference: vals[2], content_body: vals[3] });
      }
      if (rows.length > 0) { await upsertKnowledgeRows(rows); setKbRefresh((r) => r + 1); }
      setCsvSummary({ success: rows.length, errors });
    };
    reader.readAsText(file);
  }, []);

  const profitMargin = cost > 0
    ? (((wallet.refillPrice / (wallet.totalPurchased || 1)) - cost / 1000) / (wallet.refillPrice / (wallet.totalPurchased || 1))) * 100
    : 0;

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>OmniRead Librarian Control Engine</h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Manage token costs, credits, and the knowledge base.</p>

      {/* Cost Settings */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.costLabel")}</h3>
        <label htmlFor="cost-input" className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.costDesc")}</label>
        <div className="mt-2 flex items-center gap-3">
          <input id="cost-input" type="number" min={0} max={0.05} step={0.001} value={cost}
            onChange={(e) => handleCostChange(e.target.value)}
            className="w-32 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("admin.chat.profitMargin").replace("{margin}", profitMargin.toFixed(1))}
          </span>
        </div>
      </div>

      {/* Free Credit Grant */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.freeCredits")}</h3>
        <div className="flex items-center gap-3">
          <input type="number" min={1} value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)}
            className="w-24 rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
          <button type="button" onClick={handleFreeCredits}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.freeCredits")}</button>
          <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Balance: {wallet.credits}</span>
        </div>
      </div>

      {/* KB CSV Import */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.kbImport")}</h3>
        <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.kbImportDesc")}</p>
        <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${csvDragOver ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10" : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"}`}
          onDrop={(e) => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleCsvFile(f); }}
          onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }} onDragLeave={() => setCsvDragOver(false)}
          role="button" tabIndex={0} aria-label={t("admin.chat.kbImportDrop")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" aria-hidden="true"
            onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.chat.kbImportDrop")}</p>
        </div>
        {csvSummary && (
          <div className="mt-3" role="status" aria-live="polite">
            {csvSummary.success > 0 && <p className="text-sm text-emerald-400">{t("admin.chat.kbImportSuccess").replace("{count}", String(csvSummary.success))}</p>}
            {csvSummary.errors.length > 0 && csvSummary.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-400">{t("admin.chat.kbImportError").replace("{row}", String(i + 2)).replace("{error}", err)}</p>
            ))}
          </div>
        )}
      </div>

      {/* KB CRUD Grid */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("admin.chat.kbGrid")} ({kbRows.length})</h3>
          <button type="button" onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.kbAdd")}</button>
        </div>
        {showAddForm && (
          <div className="mb-4 rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg)" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" value={newBookId} onChange={(e) => setNewBookId(e.target.value)} placeholder="Book ID"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
              <select value={newType} onChange={(e) => setNewType(e.target.value as KnowledgeType)}
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }}>
                {KNOWLEDGE_TYPES.map((kt) => (<option key={kt} value={kt}>{kt}</option>))}
              </select>
              <input type="text" value={newMarker} onChange={(e) => setNewMarker(e.target.value)} placeholder="Marker (e.g. Page 45)"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
              <input type="text" value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Content body"
                className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text)", borderColor: "var(--color-border)" }} />
            </div>
            <button type="button" onClick={handleAddRow} disabled={!newBookId.trim() || !newMarker.trim() || !newContent.trim()}
              className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>{t("admin.chat.kbAdd")}</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Book ID</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Type</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Marker</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Content</th>
                <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kbRows.map((row) => (
                <tr key={row.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{row.book_id}</td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.knowledge_type}</td>
                  <td className="px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.marker_reference}</td>
                  <td className="max-w-[200px] truncate px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{row.content_body}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => handleDeleteRow(row.id)}
                      className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-900/20"
                      aria-label={`${t("admin.chat.kbDelete")} ${row.book_id} ${row.marker_reference}`}>{t("admin.chat.kbDelete")}</button>
                  </td>
                </tr>
              ))}
              {kbRows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No knowledge records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Loyalty Rewards Config Section ─── */

const EMPTY_LOYALTY_CONFIG: LoyaltyConfig = { tiers: [], pointsPerPurchase: 10, extraCreditsMultiplier: 1, conversionRate: 100, minimumRedeem: 50 };

function LoyaltyConfigSection() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<LoyaltyConfig>(EMPTY_LOYALTY_CONFIG);
  const [published, setPublished] = useState<LoyaltyConfig>(EMPTY_LOYALTY_CONFIG);
  const [hasPublished, setHasPublished] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"draft" | "published">("draft");

  useEffect(() => {
    getDraftConfig().then(setConfig);
    getPublishedConfig().then(setPublished);
    hasPublishedConfig().then(setHasPublished);
  }, [refreshKey]);

  const updateTier = useCallback((idx: number, field: keyof LoyaltyTier, value: string | number) => {
    setConfig((prev) => {
      const tiers = [...prev.tiers];
      tiers[idx] = {
        ...tiers[idx],
        [field]: field === "multiplier" ? parseFloat(value as string) || 0 : field === "pointsRequired" ? parseInt(value as string) || 0 : value,
      };
      return { ...prev, tiers };
    });
  }, []);

  const addTier = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { name: "New Tier", pointsRequired: 0, multiplier: 1 }],
    }));
  }, []);

  const removeTier = useCallback((idx: number) => {
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== idx),
    }));
  }, []);

  const handleSaveDraft = useCallback(() => {
    saveDraftConfig(config).then(() => setRefreshKey((k) => k + 1));
  }, [config]);

  const handlePublish = useCallback(() => {
    Promise.all([saveDraftConfig(config), publishConfig(config)]).then(() => {
      setShowPublishModal(false);
      setRefreshKey((k) => k + 1);
    });
  }, [config]);

  return (
    <div
      className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:px-8"
      style={{ color: "var(--color-text,#f8fafc)" }}
    >
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("admin.loyalty.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("admin.loyalty.desc")}
      </p>

      {/* Tab Switcher */}
      <div className="mb-4 flex gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("draft")}
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: activeTab === "draft" ? "var(--color-primary,#6366f1)" : "transparent",
            color: activeTab === "draft" ? "#fff" : "var(--color-text-muted,#94a3b8)",
            border: activeTab === "draft" ? "none" : "1px solid var(--color-border,#334155)",
          }}
        >
          {t("admin.loyalty.tabDraft")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("published")}
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: activeTab === "published" ? "var(--color-primary,#6366f1)" : "transparent",
            color: activeTab === "published" ? "#fff" : "var(--color-text-muted,#94a3b8)",
            border: activeTab === "published" ? "none" : "1px solid var(--color-border,#334155)",
          }}
        >
          {t("admin.loyalty.tabPublished")}
        </button>
      </div>

      {activeTab === "draft" && (
        <>
          {/* Base Settings */}
          <div
            className="mb-6 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("admin.loyalty.baseSettings")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label htmlFor="loyalty-ppp" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.ppp")}
                </label>
                <input
                  id="loyalty-ppp"
                  type="number"
                  min={1}
                  value={config.pointsPerPurchase}
                  onChange={(e) => setConfig((p) => ({ ...p, pointsPerPurchase: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-ecm" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.ecm")}
                </label>
                <input
                  id="loyalty-ecm"
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={config.extraCreditsMultiplier}
                  onChange={(e) => setConfig((p) => ({ ...p, extraCreditsMultiplier: parseFloat(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-cr" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.cr")}
                </label>
                <input
                  id="loyalty-cr"
                  type="number"
                  min={1}
                  value={config.conversionRate}
                  onChange={(e) => setConfig((p) => ({ ...p, conversionRate: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
              <div>
                <label htmlFor="loyalty-min" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("admin.loyalty.min")}
                </label>
                <input
                  id="loyalty-min"
                  type="number"
                  min={1}
                  value={config.minimumRedeem}
                  onChange={(e) => setConfig((p) => ({ ...p, minimumRedeem: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                />
              </div>
            </div>
          </div>

          {/* Tiers */}
          <div
            className="mb-6 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {t("admin.loyalty.tiers")}
              </h3>
              <button
                type="button"
                onClick={addTier}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              >
                {t("admin.loyalty.addTier")}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierName")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierPoints")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.tierMult")}
                    </th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("admin.loyalty.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {config.tiers.map((tier, idx) => (
                    <tr key={idx} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateTier(idx, "name", e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} name`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={tier.pointsRequired}
                          onChange={(e) => updateTier(idx, "pointsRequired", e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} points required`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0.5}
                          max={10}
                          step={0.1}
                          value={tier.multiplier}
                          onChange={(e) => updateTier(idx, "multiplier", e.target.value)}
                          className="w-20 rounded border px-2 py-1 text-xs"
                          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
                          aria-label={`Tier ${idx + 1} multiplier`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-900/20"
                          aria-label={`Remove tier ${tier.name}`}
                        >
                          {t("admin.loyalty.remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Draft / Publish Controls */}
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border p-5"
            style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
          >
            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("admin.loyalty.saveDraft")}
            </button>
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "#059669" }}
            >
              {t("admin.loyalty.publish")}
            </button>
            <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {hasPublished ? t("admin.loyalty.publishedExists") : t("admin.loyalty.noPublished")}
            </span>
          </div>
        </>
      )}

      {activeTab === "published" && (
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("admin.loyalty.currentPublished")}
          </h3>
          <div className="space-y-2 text-sm">
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.ppp")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.pointsPerPurchase}</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.ecm")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.extraCreditsMultiplier}x</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.cr")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.conversionRate} pts = $1</span>
            </p>
            <p style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.min")}: <span className="font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{published.minimumRedeem}</span>
            </p>
            <div className="pt-2">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("admin.loyalty.tiers")}</p>
              {published.tiers.map((tier, idx) => (
                <p key={idx} className="text-xs ml-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {tier.name}: {tier.pointsRequired} pts → {tier.multiplier}x
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={t("admin.loyalty.publishConfirm")}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ backgroundColor: "var(--color-surface,#1e293b)", borderColor: "var(--color-border,#334155)" }}
          >
            <h3 className="text-base font-bold mb-2" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("admin.loyalty.publishConfirm")}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("admin.loyalty.publishWarning")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}
              >
                {t("admin.loyalty.cancel")}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "#059669" }}
              >
                {t("admin.loyalty.confirmPublish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Affiliate Payroll & Management ─── */

type AffLedgerRow = AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus };

const AFF_STATUS_FILTERS = ["all", "in_hold", "payable", "paid", "converted", "voided"] as const;
type AffStatusFilter = (typeof AFF_STATUS_FILTERS)[number];

const AFF_STATUS_LABELS: Record<LedgerDisplayStatus, string> = {
  in_hold: "In Hold",
  payable: "Payable",
  paid: "Paid",
  converted: "Converted",
  voided: "Voided",
};

const AFF_STATUS_COLORS: Record<LedgerDisplayStatus, string> = {
  in_hold: "var(--color-text-muted,#94a3b8)",
  payable: "#fbbf24",
  paid: "#34d399",
  converted: "#818cf8",
  voided: "#f87171",
};

function affStatusBadge(status: LedgerDisplayStatus) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${AFF_STATUS_COLORS[status]} 20%, transparent)`, color: AFF_STATUS_COLORS[status] }}
    >
      {AFF_STATUS_LABELS[status]}
    </span>
  );
}

function AffiliateAdminSection() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AffiliateProfileRow[]>([]);
  const [payableByAffiliate, setPayableByAffiliate] = useState<Map<string, PayableSummaryRow>>(new Map());
  const [payouts, setPayouts] = useState<AffiliatePayoutRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settleMsg, setSettleMsg] = useState("");
  const [settleNotes, setSettleNotes] = useState<Record<string, string>>({});
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLedger, setExpandedLedger] = useState<AffLedgerRow[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<AffStatusFilter>("all");

  const [affSettings, setAffSettings] = useState<AffiliateSettings>(DEFAULT_AFFILIATE_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const refresh = useCallback(async () => {
    const [allProfiles, summary, history, settingsRow] = await Promise.all([
      getAllAffiliateProfiles(),
      getPayableSummary(),
      getPayoutHistory(),
      getAffiliateSettings(),
    ]);
    setProfiles(allProfiles);
    setPayableByAffiliate(new Map(summary.map((s) => [s.affiliateId, s])));
    setPayouts(history);
    setAffSettings(settingsRow);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh, refreshKey]);

  const loadLedgerFor = useCallback(async (affiliateId: string) => {
    setExpandedLoading(true);
    const rows = await getAffiliateLedgerForAdmin(affiliateId);
    setExpandedLedger(rows);
    setExpandedLoading(false);
  }, []);

  const toggleExpand = useCallback(
    (affiliateId: string) => {
      if (expandedId === affiliateId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(affiliateId);
      setExpandedFilter("all");
      loadLedgerFor(affiliateId);
    },
    [expandedId, loadLedgerFor],
  );

  const handleSettle = useCallback(
    async (affiliateId: string) => {
      setSettlingId(affiliateId);
      const referenceNote = settleNotes[affiliateId] ?? "";
      const result = await settleAffiliatePayout(affiliateId, referenceNote);
      setSettlingId(null);
      if (result.amount > 0) {
        const handle = profiles.find((p) => p.id === affiliateId)?.handle ?? affiliateId;
        setSettleMsg(`Settled $${result.amount.toFixed(2)} for @${handle}`);
        setSettleNotes((prev) => ({ ...prev, [affiliateId]: "" }));
        setRefreshKey((k) => k + 1);
        if (expandedId === affiliateId) loadLedgerFor(affiliateId);
        setTimeout(() => setSettleMsg(""), 3000);
      }
    },
    [settleNotes, profiles, expandedId, loadLedgerFor],
  );

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    await saveAffiliateSettings(affSettings);
    setSavingSettings(false);
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  }, [affSettings]);

  const filteredExpandedLedger =
    expandedFilter === "all" ? expandedLedger : expandedLedger.filter((e) => e.displayStatus === expandedFilter);

  const handleByAffiliateId = new Map(profiles.map((p) => [p.id, p.handle]));

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("affiliate.adminTitle")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        Manage affiliate profiles, review sales, and process payouts.
      </p>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Loading…</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No affiliate profiles registered yet.</p>
        </div>
      ) : (
        <>
          {settleMsg && (
            <div className="mb-4 rounded-lg px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
              {settleMsg}
            </div>
          )}

          {/* Affiliate List */}
          <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              Affiliates ({profiles.length})
            </h3>
            <div className="space-y-2">
              {profiles.map((p) => {
                const summary = payableByAffiliate.get(p.id);
                const payableAmount = summary?.payableAmount ?? 0;
                const inHoldAmount = summary?.inHoldAmount ?? 0;
                const expanded = expandedId === p.id;
                return (
                  <div key={p.id} className="rounded-lg border" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(p.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left"
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                          {p.brandName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                          @{p.handle} — {p.paymentMethod}: {p.paymentDetail} — payout: {p.payoutPreference}
                        </p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Payable</p>
                          <p className="text-sm font-bold" style={{ color: "#fbbf24" }}>${payableAmount.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>In Hold</p>
                          <p className="text-sm font-bold" style={{ color: "var(--color-text-muted,#94a3b8)" }}>${inHoldAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t p-3" style={{ borderColor: "var(--color-border,#334155)" }}>
                        {/* Settle action */}
                        {payableAmount > 0 && (
                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={settleNotes[p.id] ?? ""}
                              onChange={(e) => setSettleNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              placeholder="Reference note (optional)"
                              className="min-w-[180px] flex-1 rounded-lg border px-3 py-1.5 text-xs"
                              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSettle(p.id)}
                              disabled={settlingId === p.id}
                              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
                              style={{ backgroundColor: "#059669" }}
                            >
                              {settlingId === p.id ? "..." : `Settle $${payableAmount.toFixed(2)}`}
                            </button>
                          </div>
                        )}

                        {/* Status filter */}
                        <div className="mb-3 flex flex-wrap gap-1">
                          {AFF_STATUS_FILTERS.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setExpandedFilter(f)}
                              className="rounded px-2 py-1 text-[10px] font-medium transition-colors"
                              style={{
                                color: expandedFilter === f ? "var(--color-primary,#6366f1)" : "var(--color-text-muted,#94a3b8)",
                                backgroundColor: expandedFilter === f ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "transparent",
                              }}
                            >
                              {f === "all" ? "All" : AFF_STATUS_LABELS[f]}
                            </button>
                          ))}
                        </div>

                        {expandedLoading ? (
                          <p className="py-4 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Loading…</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Date</th>
                                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Book</th>
                                  <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Value</th>
                                  <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Comm.</th>
                                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredExpandedLedger.map((entry) => (
                                  <tr key={entry.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                                      {new Date(entry.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>{entry.productTitle}</td>
                                    <td className="px-3 py-2 text-right" style={{ color: "var(--color-text,#f8fafc)" }}>${Number(entry.purchaseValue).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right" style={{ color: "#34d399" }}>${Number(entry.commissionSlice).toFixed(2)}</td>
                                    <td className="px-3 py-2">{affStatusBadge(entry.displayStatus)}</td>
                                  </tr>
                                ))}
                                {filteredExpandedLedger.length === 0 && (
                                  <tr><td colSpan={5} className="px-3 py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No entries match filter.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payout History */}
          <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              Payout History ({payouts.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Date</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Affiliate</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Amount</th>
                    <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                        {new Date(payout.settledAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text,#f8fafc)" }}>
                        @{handleByAffiliateId.get(payout.affiliateId) ?? payout.affiliateId}
                      </td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: "#34d399" }}>${Number(payout.amount).toFixed(2)}</td>
                      <td className="px-3 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{payout.referenceNote || "—"}</td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No payouts settled yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Affiliate Settings */}
          <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
            <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="aff-commission-rate" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  Commission Rate (decimal, e.g. 0.1 = 10%)
                </label>
                <input
                  id="aff-commission-rate"
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={affSettings.commissionRate}
                  onChange={(e) => setAffSettings((p) => ({ ...p, commissionRate: parseFloat(e.target.value) || 0 }))}
                  className="w-32 rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                />
              </div>
              <div>
                <label htmlFor="aff-attribution-window" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  Attribution Window (days)
                </label>
                <input
                  id="aff-attribution-window"
                  type="number"
                  min={1}
                  value={affSettings.attributionWindowDays}
                  onChange={(e) => setAffSettings((p) => ({ ...p, attributionWindowDays: parseInt(e.target.value, 10) || 0 }))}
                  className="w-32 rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                />
              </div>
              <div>
                <label htmlFor="aff-hold-period" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  Hold Period (days)
                </label>
                <input
                  id="aff-hold-period"
                  type="number"
                  min={0}
                  value={affSettings.holdPeriodDays}
                  onChange={(e) => setAffSettings((p) => ({ ...p, holdPeriodDays: parseInt(e.target.value, 10) || 0 }))}
                  className="w-32 rounded-lg border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              >
                {savedSettings ? "Saved!" : savingSettings ? "..." : "Save Settings"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Promotions & Discounts Admin Section ─── */

function PromotionsAdminSection() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<PromoSettings>(DEFAULT_PROMO_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bulkCatalogs, setBulkCatalogs] = useState(getCatalogItems());
  const [bulkRefresh, setBulkRefresh] = useState(0);
  const [bulkOverrideActive, setBulkOverrideActive] = useState(false);
  const [bulkOverrideType, setBulkOverrideType] = useState<"percentage" | "flat" | "fixed">("percentage");
  const [bulkOverrideValue, setBulkOverrideValue] = useState("20");

  useEffect(() => {
    getPromoSettings().then(setSettings);
    setBulkCatalogs(getCatalogItems());
  }, [bulkRefresh]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    await savePromoSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleBulkToggle = useCallback((idx: number, val: boolean) => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], promoOverride: val ? { hasOverride: true, overrideType: "percentage", overrideValue: 20 } : undefined };
      return next;
    });
  }, []);

  const handleBulkType = useCallback((idx: number, val: "percentage" | "flat" | "fixed") => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      const current = next[idx].promoOverride;
      if (current) next[idx] = { ...next[idx], promoOverride: { ...current, overrideType: val } };
      return next;
    });
  }, []);

  const handleBulkValue = useCallback((idx: number, val: number) => {
    setBulkCatalogs((prev) => {
      const next = [...prev];
      const current = next[idx].promoOverride;
      if (current) next[idx] = { ...next[idx], promoOverride: { ...current, overrideValue: val } };
      return next;
    });
  }, []);

  const handleApplyToAll = useCallback(() => {
    setBulkCatalogs((prev) =>
      prev.map((item) => ({
        ...item,
        promoOverride: bulkOverrideActive
          ? { hasOverride: true, overrideType: bulkOverrideType, overrideValue: parseFloat(bulkOverrideValue) || 0 }
          : undefined,
      }))
    );
  }, [bulkOverrideActive, bulkOverrideType, bulkOverrideValue]);

  const handleSaveBulk = useCallback(() => {
    if (typeof window === "undefined") return;
    const existing = getCatalogItems();
    const updated = existing.map((existingItem) => {
      const bulkItem = bulkCatalogs.find((b) => b.id === existingItem.id);
      if (bulkItem) return { ...existingItem, promoOverride: bulkItem.promoOverride };
      return existingItem;
    });
    localStorage.setItem("omnimedos_catalog", JSON.stringify(updated));
    setBulkRefresh((k) => k + 1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [bulkCatalogs]);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("promo.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("promo.desc")}
      </p>

      {/* Settings Panel */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Settings</h3>

        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.isPromoModuleEnabled}
              aria-label={t("promo.masterToggle")}
              onClick={() => setSettings((p) => ({ ...p, isPromoModuleEnabled: !p.isPromoModuleEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isPromoModuleEnabled ? "bg-emerald-500" : "bg-gray-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isPromoModuleEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>{t("promo.masterToggle")}</span>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.discountType")}</label>
            <select
              value={settings.globalDiscountType}
              onChange={(e) => setSettings((p) => ({ ...p, globalDiscountType: e.target.value as "percentage" | "flat" | "coupon" }))}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            >
              <option value="percentage">{t("promo.percentage")}</option>
              <option value="flat">{t("promo.flat")}</option>
              <option value="coupon">{t("promo.coupon")}</option>
            </select>
          </div>

          {/* Discount Value */}
          <div>
            <label htmlFor="promo-value" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("promo.discountValue")}
            </label>
            <input
              id="promo-value"
              type="number"
              min={0}
              value={settings.globalDiscountValue}
              onChange={(e) => setSettings((p) => ({ ...p, globalDiscountValue: parseFloat(e.target.value) || 0 }))}
              className="w-32 rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            />
          </div>

          {/* Coupon Code */}
          {settings.globalDiscountType === "coupon" && (
            <div>
              <label htmlFor="promo-coupon" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("promo.couponCode")}
              </label>
              <input
                id="promo-coupon"
                type="text"
                value={settings.activeCouponCode}
                onChange={(e) => setSettings((p) => ({ ...p, activeCouponCode: e.target.value }))}
                className="w-48 rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              />
            </div>
          )}

          {/* Format Restriction — only for coupon type */}
          {settings.globalDiscountType === "coupon" && (
            <div>
              <label htmlFor="promo-format-restr" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("promo.formatRestriction")}
              </label>
              <select
                id="promo-format-restr"
                value={settings.couponFormatRestriction ?? "all"}
                onChange={(e) => setSettings((p) => ({ ...p, couponFormatRestriction: e.target.value as "all" | "ebook" | "audiobook" | "video" }))}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              >
                <option value="all">{t("promo.allFormats")}</option>
                <option value="ebook">{t("promo.ebooksOnly")}</option>
                <option value="audiobook">{t("promo.audiobooksOnly")}</option>
                <option value="video">{t("promo.videosOnly")}</option>
              </select>
            </div>
          )}

          {/* Announcement Text */}
          <div>
            <label htmlFor="promo-announce" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("promo.announcement")}
            </label>
            <input
              id="promo-announce"
              type="text"
              value={settings.announcementText}
              onChange={(e) => setSettings((p) => ({ ...p, announcementText: e.target.value }))}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            />
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {saved ? t("promo.saved") : saving ? "..." : t("promo.saveSettings")}
          </button>
        </div>
      </div>

      {/* Catalog Bulk Editor */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("promo.bulkEditor")} ({bulkCatalogs.length})
          </h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={bulkOverrideActive}
                onChange={(e) => setBulkOverrideActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.hasOverride")}</span>
            </label>
            <select
              value={bulkOverrideType}
              onChange={(e) => setBulkOverrideType(e.target.value as "percentage" | "flat" | "fixed")}
              className="rounded border px-2 py-1 text-[10px]"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              disabled={!bulkOverrideActive}
            >
              <option value="percentage">%</option>
              <option value="flat">$</option>
              <option value="fixed">Fix</option>
            </select>
            <input
              type="number"
              min={0}
              value={bulkOverrideValue}
              onChange={(e) => setBulkOverrideValue(e.target.value)}
              className="w-16 rounded border px-2 py-1 text-[10px]"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              disabled={!bulkOverrideActive}
            />
            <button
              type="button"
              onClick={handleApplyToAll}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
            >
              {t("promo.applyToAll")}
            </button>
            <button
              type="button"
              onClick={handleSaveBulk}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
              style={{ backgroundColor: "#059669" }}
            >
              {t("promo.saveBulk")}
            </button>
          </div>
        </div>

        {bulkCatalogs.length === 0 ? (
          <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No catalog items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Title</th>
                  <th className="px-3 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Price</th>
                  <th className="px-3 py-2 font-medium text-center" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.hasOverride")}</th>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.overrideType")}</th>
                  <th className="px-3 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("promo.overrideValue")}</th>
                </tr>
              </thead>
              <tbody>
                {bulkCatalogs.map((item, idx) => (
                  <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: "var(--color-text,#f8fafc)" }}>{item.title}</td>
                    <td className="px-3 py-2 text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>${item.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!item.promoOverride?.hasOverride}
                        onChange={(e) => handleBulkToggle(idx, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {item.promoOverride?.hasOverride ? (
                        <select
                          value={item.promoOverride.overrideType}
                          onChange={(e) => handleBulkType(idx, e.target.value as "percentage" | "flat" | "fixed")}
                          className="rounded border px-2 py-1 text-[10px]"
                          style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                        >
                          <option value="percentage">%</option>
                          <option value="flat">$</option>
                          <option value="fixed">Fix</option>
                        </select>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.promoOverride?.hasOverride ? (
                        <input
                          type="number"
                          min={0}
                          value={item.promoOverride.overrideValue}
                          onChange={(e) => handleBulkValue(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border px-2 py-1 text-[10px]"
                          style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                        />
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>—</span>
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

/* ─── Comment Moderation ─── */

function AdminCommentNode({
  comment,
  depth,
  onDelete,
}: {
  comment: Comment;
  depth: number;
  onDelete: (id: string) => void;
}) {
  const maxDepth = 5;
  const indent = Math.min(depth, maxDepth);

  return (
    <div style={{ marginLeft: indent > 0 ? `${indent * 16}px` : "0" }}>
      <div
        className="mt-2 flex items-start justify-between gap-3 rounded-lg border p-3"
        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{comment.author}</span>
            <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {new Date(comment.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {comment.body}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(comment.id)}
          className="shrink-0 rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-900/20"
          aria-label={`Delete comment by ${comment.author}`}
        >
          Delete
        </button>
      </div>
      {comment.replies.map((reply) => (
        <AdminCommentNode key={reply.id} comment={reply} depth={depth + 1} onDelete={onDelete} />
      ))}
    </div>
  );
}

function CommentModerationSection() {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [threads, setThreads] = useState<Comment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getProductsWithComments().then((ids) => {
      setProductIds(ids);
      setSelectedProductId((prev) => (prev && ids.includes(prev) ? prev : (ids[0] ?? "")));
    });
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedProductId) {
      setThreads([]);
      return;
    }
    getCommentsForProduct(selectedProductId).then(setThreads);
  }, [selectedProductId, refreshKey]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteComment(id);
    setRefreshKey((k) => k + 1);
  }, []);

  const totalComments = (list: Comment[]): number =>
    list.reduce((sum, c) => sum + 1 + totalComments(c.replies), 0);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Comment Moderation</h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        Review and remove discussion comments from product pages. Deleting a top-level comment also removes its replies.
      </p>

      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
        {productIds.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No comments yet.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor="comment-product-select" className="text-xs font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                Product
              </label>
              <select
                id="comment-product-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              >
                {productIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {totalComments(threads)} comment{totalComments(threads) === 1 ? "" : "s"}
              </span>
            </div>

            {threads.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No comments for this product.</p>
            ) : (
              <div role="list" aria-label="Comments">
                {threads.map((comment) => (
                  <AdminCommentNode key={comment.id} comment={comment} depth={0} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Catalog Status Management ─── */
function CatalogStatusManagement() {
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setCatalog(getCatalogItems());
  }, [refreshKey]);

  const handleStatusChange = useCallback((id: string, status: CatalogStatus) => {
    updateCatalogStatus(id, status);
    setSaved(`Status updated for item ${id}`);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSaved(""), 2000);
  }, []);

  const handleRatingChange = useCallback((id: string, rating: number) => {
    updateCatalogRating(id, rating);
    setRefreshKey((k) => k + 1);
  }, []);

  if (catalog.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("admin.catalog.statusManagement")}
        </h2>
        <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("admin.catalog.statusDesc")}
        </p>
        <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--color-border,#334155)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>No catalog items yet. Add products first.</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status: string | undefined) => {
    if (!status || status === "live") {
      return <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Live</span>;
    }
    if (status === "coming-soon") {
      return <span className="rounded bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">Coming Soon</span>;
    }
    return <span className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-400">Retired</span>;
  };

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("admin.catalog.statusManagement")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("admin.catalog.statusDesc")}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {saved}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-border,#334155)" }}>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Title</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Status</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Rating</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Reviews</th>
              <th className="px-4 py-3 font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => (
              <tr key={item.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: "var(--color-border,#334155)" }}>
                <td className="max-w-[200px] truncate px-4 py-3 font-medium" style={{ color: "var(--color-text,#f8fafc)" }}>
                  {item.title}
                </td>
                <td className="px-4 py-3">{statusBadge(item.status)}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={item.rating ?? 0}
                    onChange={(e) => handleRatingChange(item.id, parseFloat(e.target.value) || 0)}
                    className="w-16 rounded border px-2 py-1 text-[10px]"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                    aria-label={`Rating for ${item.title}`}
                  />
                </td>
                <td className="px-4 py-3" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {item.reviewCount ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "live")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "live" || !item.status ? "bg-emerald-900/30 text-emerald-400" : "text-gray-500 hover:text-emerald-400"}`}
                      aria-label={`Set ${item.title} to Live`}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "coming-soon")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "coming-soon" ? "bg-amber-900/30 text-amber-400" : "text-gray-500 hover:text-amber-400"}`}
                      aria-label={`Set ${item.title} to Coming Soon`}
                    >
                      Coming
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, "retired")}
                      className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${item.status === "retired" ? "bg-red-900/30 text-red-400" : "text-gray-500 hover:text-red-400"}`}
                      aria-label={`Set ${item.title} to Retired`}
                    >
                      Retire
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Storefront Layout Settings ─── */
function StorefrontLayoutSettings() {
  const { t } = useLanguage();
  const [layout, setLayoutState] = useState<LayoutType>(getActiveLayout());
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [featuredId, setFeaturedIdState] = useState<string | null>(getFeaturedProductId());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCatalog(getCatalogItems());
  }, []);

  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayoutState(newLayout);
    setActiveLayout(newLayout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleFeaturedChange = useCallback((id: string) => {
    setFeaturedIdState(id);
    setFeaturedProductId(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const allProducts = catalog.length > 0 ? catalog : [];

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("layout.title")}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        Choose your storefront layout and configure featured content.
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          Settings saved!
        </div>
      )}

      {/* Layout selector — radio cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {([
          { value: "classic" as LayoutType, labelKey: "layout.classic", descKey: "layout.classicDesc", icon: "📐" },
          { value: "spotlight" as LayoutType, labelKey: "layout.spotlight", descKey: "layout.spotlightDesc", icon: "🔦" },
          { value: "magazine" as LayoutType, labelKey: "layout.magazine", descKey: "layout.magazineDesc", icon: "📰" },
        ]).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleLayoutChange(opt.value)}
            className={`rounded-xl border p-5 text-left transition-all hover:opacity-80 ${
              layout === opt.value ? "ring-2" : ""
            }`}
            style={{
              borderColor: layout === opt.value ? "var(--color-primary,#6366f1)" : "var(--color-border,#334155)",
              backgroundColor: layout === opt.value
                ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)"
                : "var(--color-surface,#1e293b)/30",
              ringColor: "var(--color-primary,#6366f1)",
            }}
            aria-label={t(opt.labelKey)}
          >
            <div className="mb-2 text-2xl" aria-hidden="true">{opt.icon}</div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t(opt.labelKey)}
            </h3>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t(opt.descKey)}
            </p>
          </button>
        ))}
      </div>

      {/* Spotlight featured product selector */}
      {layout === "spotlight" && (
        <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}>
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("layout.featuredProduct")}
          </h3>
          {allProducts.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              No catalog items yet. Add products to select a featured item.
            </p>
          ) : (
            <select
              value={featuredId ?? ""}
              onChange={(e) => handleFeaturedChange(e.target.value)}
              className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--color-bg,#0f172a)",
                color: "var(--color-text,#f8fafc)",
                borderColor: "var(--color-border,#334155)",
              }}
              aria-label={t("layout.featuredProduct")}
            >
              <option value="">{t("layout.featuredProduct")}</option>
              {allProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} — ${item.price.toFixed(2)}
                </option>
              ))}
            </select>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("layout.spotlightDesc")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── License Tier Section ─── */
function LicenseTierSection() {
  const { t } = useLanguage();
  const [tier, setTier] = useState<LicenseTier>("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLicenseTier().then(setTier);
  }, []);

  // setLicenseTier() calls requireAdmin() server-side — the real gate.
  // sessionStorage only controls whether this control even renders; if the
  // signed session cookie is missing or expired, this call rejects and the
  // optimistic UI update below is rolled back.
  const handleChange = useCallback(async (next: LicenseTier) => {
    setError("");
    const previous = tier;
    setTier(next);
    setSaving(true);
    try {
      await setLicenseTier(next);
      dispatchLicenseChange();
    } catch {
      setTier(previous);
      setError("Your admin session has expired or is invalid — please log out and back in.");
    } finally {
      setSaving(false);
    }
  }, [tier]);

  const isPremium = tier === "premium";

  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-lg border px-4 py-3"
        style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }} aria-hidden="true">
          <svg className="h-4 w-4" style={{ color: "var(--color-primary,#6366f1)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{t("license.adminTitle") ?? "License Tier"}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isPremium ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
              }`}
            >
              <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isPremium ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
              {isPremium ? t("license.allFeatures") : t("license.inactive")}
            </span>
          </div>
        </div>
        <label htmlFor="license-tier-select" className="sr-only">
          {t("license.adminTitle") ?? "License Tier"}
        </label>
        <select
          id="license-tier-select"
          value={tier}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as LicenseTier)}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}
        >
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>
      )}
    </div>
  );
}